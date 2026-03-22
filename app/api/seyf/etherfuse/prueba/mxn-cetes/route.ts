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
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mxn = Number.parseFloat(
    parsed.data.sourceAmount.replace(",", "."),
  );
  if (!Number.isFinite(mxn) || mxn < 500) {
    return NextResponse.json(
      { error: "Monto inválido o mínimo 500 MXN." },
      { status: 400 },
    );
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
      const message =
        e instanceof Error ? e.message : "No se pudo resolver identidad rampa";
      return NextResponse.json(
        { error: message, step: "identity" as const },
        { status: 502 },
      );
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
      const message =
        e instanceof Error ? e.message : "Error en GET /ramp/assets";
      return NextResponse.json(
        { error: message, step: "ramp_assets" as const },
        { status: 502 },
      );
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
      return NextResponse.json(
        {
          error:
            "No hay CETES usable: hace falta fila CETES en GET /ramp/assets (trust line en Stellar testnet al issuer que devuelve Etherfuse). No uses un issuer distinto en .env: en sandbox provoca NonStableAsset.",
        },
        { status: 422 },
      );
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
      const message =
        e instanceof Error ? e.message : "Error en cotización u orden onramp";
      return NextResponse.json(
        { error: message, step: "quote_or_order" as const },
        { status: 502 },
      );
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
      simulateFiat = fr.ok
        ? { ok: true as const, result: simJson }
        : { ok: false as const, status: fr.status, error: text.slice(0, 500) };
    }

    let orderSnapshot: unknown = null;
    let orderFetchError: string | null = null;
    try {
      orderSnapshot = await fetchOrderDetailsWithRetry(ramp.deposit.orderId);
    } catch (e) {
      orderFetchError = e instanceof Error ? e.message : String(e);
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
      orderFetchError,
      speiRecipientDisplayName,
      prepareOnly,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error en prueba MXN→CETES";
    console.error("[mxn-cetes]", message);
    return NextResponse.json(
      { error: message, step: "unknown" as const },
      { status: 502 },
    );
  }
}
