import { NextResponse } from "next/server";
import { z } from "zod";
import { etherfuseFetch, etherfuseReadBody } from "@/lib/etherfuse/client";
import { executeMvpPartnerOnramp } from "@/lib/etherfuse/mvp-onramp";
import {
  fetchOrderDetailsWithRetry,
  pickOrderDisplayFields,
} from "@/lib/etherfuse/orders-api";
import {
  fetchRampableAssetsForWallet,
  pickCetesTargetIdentifier,
} from "@/lib/etherfuse/ramp-api";
import {
  type MvpPartnerRampIdentity,
  resolveMvpPartnerRampIdentity,
} from "@/lib/etherfuse/partner-accounts";
import {
  seyfApiError,
  seyfErrorFromUnknown,
  SEYF_VALIDATION_MESSAGE_ES,
} from "@/lib/seyf/api-error";
import { getEtherfuseRampContext } from "@/lib/seyf/etherfuse-ramp-context";
import { isEtherfuseDevPanelEnabled } from "@/lib/seyf/etherfuse-dev-panel";
import { guardEtherfuseRampRoutes } from "@/lib/seyf/etherfuse-ramp-guard";

/**
 * Onramp MXN (fiat) → CETES en Stellar (sandbox / devnet).
 * Flujo alineado con la guía de onramps y activos rampables (Etherfuse FX API).
 *
 * @see https://docs.etherfuse.com/guides/testing-onramps
 * @see https://docs.etherfuse.com/api-reference/assets/get-rampable-assets
 */
const bodySchema = z.object({
  sourceAmount: z.string().min(1),
  forceNew: z.boolean().optional(),
  /** Si true y entorno dev/panel, llama POST sandbox fiat_received tras crear la orden. */
  simulateFiat: z.boolean().optional(),
  /**
   * Solo crea cotización + orden (CLABE SPEI); no simula fiat. Para mostrar recuento y confirmar con
   * `POST .../mxn-cetes/confirm`.
   */
  prepareOnly: z.boolean().optional(),
  /**
   * Por defecto false: misma prioridad que `getEtherfuseRampContext` (cookie /identidad, luego MVP en dev).
   * Pon true para ignorar la cookie y usar solo `ETHERFUSE_MVP_*` (útil si KYC/sesión web no coinciden con la API).
   */
  useMvpIdentity: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const denied = guardEtherfuseRampRoutes();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return seyfApiError(400, "bad_json");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return seyfApiError(400, "validation_error", { message_es: SEYF_VALIDATION_MESSAGE_ES });
  }

  const mxn = Number.parseFloat(
    parsed.data.sourceAmount.replace(",", "."),
  );
  if (!Number.isFinite(mxn) || mxn < 500) {
    return seyfApiError(400, "validation_error", {
      message_es: "El monto no es válido o es menor al mínimo permitido (500 MXN).",
    });
  }

  try {
    let identity: MvpPartnerRampIdentity;
    let contextSource: "cookie" | "mvp_env";

    try {
      if (parsed.data.useMvpIdentity) {
        identity = await resolveMvpPartnerRampIdentity();
        contextSource = "mvp_env";
      } else {
        const ctx = await getEtherfuseRampContext();
        if (ctx) {
          identity = {
            customerId: ctx.customerId,
            publicKey: ctx.publicKey,
            bankAccountId: ctx.bankAccountId,
          };
          contextSource = ctx.source;
        } else {
          identity = await resolveMvpPartnerRampIdentity();
          contextSource = "mvp_env";
        }
      }
    } catch (e) {
      console.error("[mxn-cetes] identity", e);
      return seyfErrorFromUnknown(e);
    }

    let assets: Awaited<
      ReturnType<typeof fetchRampableAssetsForWallet>
    >["assets"];
    try {
      const row = await fetchRampableAssetsForWallet({
        walletPublicKey: identity.publicKey,
      });
      assets = row.assets;
    } catch (e) {
      console.error("[mxn-cetes] ramp_assets", e);
      return seyfErrorFromUnknown(e);
    }
    let cetesId = pickCetesTargetIdentifier(assets);
    if (!cetesId) {
      const env = process.env.ETHERFUSE_ONRAMP_TARGET_ASSET?.trim();
      if (env?.toUpperCase().startsWith("CETES:")) {
        const listed = assets.some((a) => (a.identifier ?? "").trim() === env);
        if (listed || assets.length === 0) cetesId = env;
      }
    }
    if (!cetesId) {
      return seyfApiError(422, "validation_error", {
        message_es:
          "No hay un activo CETES disponible para esta cuenta en sandbox. Revisa la línea de confianza en Stellar y la configuración de activos rampables.",
      });
    }

    let ramp: Awaited<ReturnType<typeof executeMvpPartnerOnramp>>;
    try {
      ramp = await executeMvpPartnerOnramp({
        sourceAmount: parsed.data.sourceAmount,
        amountMxn: mxn,
        forceNew: parsed.data.forceNew === true,
        targetAssetIdentifier: cetesId,
        identity,
      });
    } catch (e) {
      console.error("[mxn-cetes] quote_or_order", e);
      return seyfErrorFromUnknown(e);
    }

    const speiRecipientDisplayName =
      process.env.SEYF_SPEI_DISPLAY_NAME?.trim() || "Etherfuse";

    let simulateFiat: unknown = null;
    const prepareOnly = parsed.data.prepareOnly === true;
    const wantSim =
      !prepareOnly &&
      parsed.data.simulateFiat !== false &&
      isEtherfuseDevPanelEnabled();
    if (wantSim) {
      const fr = await etherfuseFetch("/ramp/order/fiat_received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: ramp.deposit.orderId }),
      });
      const { json: simJson, text } = await etherfuseReadBody(fr);
      if (!fr.ok) {
        console.error("[mxn-cetes] fiat_received", fr.status, text.slice(0, 800));
      }
      simulateFiat = fr.ok
        ? { ok: true as const, result: simJson }
        : { ok: false as const, status: fr.status };
    }

    let orderSnapshot: unknown = null;
    let orderFetchFailed = false;
    try {
      orderSnapshot = await fetchOrderDetailsWithRetry(ramp.deposit.orderId);
    } catch (e) {
      orderFetchFailed = true;
      console.warn("[mxn-cetes] order fetch", e);
    }

    const orderDisplay = orderSnapshot
      ? pickOrderDisplayFields(orderSnapshot)
      : null;

    return NextResponse.json({
      network: "sandbox",
      contextSource,
      targetAssetUsed: cetesId,
      ramp,
      simulateFiat,
      order: orderSnapshot,
      /** Resumen para UI: hash on-chain (`confirmedTxSignature`), estado y página Etherfuse (`statusPage`). */
      orderDisplay,
      orderFetchFailed,
      speiRecipientDisplayName,
      prepareOnly,
    });
  } catch (e) {
    console.error("[mxn-cetes]", e);
    return seyfErrorFromUnknown(e);
  }
}
