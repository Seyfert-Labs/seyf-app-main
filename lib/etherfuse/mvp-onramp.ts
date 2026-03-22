import {
  createMxOnrampOrder,
  createMxOnrampQuote,
  fetchRampableAssetsForWallet,
  pickOnrampTargetIdentifier,
} from "./ramp-api";
import {
  type MvpPartnerRampIdentity,
  resolveMvpPartnerCryptoWalletId,
  resolveMvpPartnerRampIdentity,
} from "./partner-accounts";
import {
  cancelOrder,
  fetchOrderDetails,
  fetchOrdersFirstPage,
  findPendingOnrampOrderForAmount,
} from "./orders-api";

function quoteIdFromPayload(q: unknown): string | undefined {
  if (!q || typeof q !== "object") return undefined;
  const o = q as Record<string, unknown>;
  if (typeof o.quoteId === "string") return o.quoteId;
  if (typeof o.quote_id === "string") return o.quote_id;
  return undefined;
}

function depositFromCreateOrderResponse(data: unknown): {
  orderId: string;
  clabe: string;
  depositAmount: number;
} | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const onramp = root.onramp ?? root.onRamp;
  if (!onramp || typeof onramp !== "object") return null;
  const o = onramp as Record<string, unknown>;
  const orderId =
    typeof o.orderId === "string"
      ? o.orderId
      : typeof o.order_id === "string"
        ? o.order_id
        : "";
  const clabe =
    typeof o.depositClabe === "string"
      ? o.depositClabe
      : typeof o.deposit_clabe === "string"
        ? o.deposit_clabe
        : "";
  const amt =
    typeof o.depositAmount === "number"
      ? o.depositAmount
      : typeof o.deposit_amount === "number"
        ? o.deposit_amount
        : NaN;
  if (!orderId || !clabe || !Number.isFinite(amt)) return null;
  return { orderId, clabe, depositAmount: amt };
}

function depositFromOrderDetail(data: unknown): {
  orderId: string;
  clabe: string;
  depositAmount: number;
} | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const orderId =
    typeof o.orderId === "string"
      ? o.orderId
      : typeof o.order_id === "string"
        ? o.order_id
        : "";
  const clabe =
    typeof o.depositClabe === "string"
      ? o.depositClabe
      : typeof o.deposit_clabe === "string"
        ? o.deposit_clabe
        : "";
  let amt: number = NaN;
  const raw = o.amountInFiat ?? o.amount_in_fiat;
  if (typeof raw === "number") amt = raw;
  else if (typeof raw === "string") amt = Number.parseFloat(raw);
  if (!orderId || !clabe || !Number.isFinite(amt)) return null;
  return { orderId, clabe, depositAmount: amt };
}

export type MvpOnrampResult = {
  mode: "new" | "reused";
  walletPublicKey: string;
  bankAccountId: string;
  customerId: string;
  targetAsset: string;
  quote: unknown;
  deposit: {
    orderId: string;
    clabe: string;
    depositAmount: number;
  };
  reusedFromPending: boolean;
};

/**
 * Cotización + orden onramp usando solo wallet y cuenta bancaria de la org (API key).
 * Ante 409 reutiliza la orden pendiente misma cuenta + monto; opcionalmente cancela y reintenta.
 *
 * @param targetAssetIdentifier — p. ej. `CETES:GCRY...` para forzar MXN → CETES sin depender del orden de pick.
 * @param identity — Si se omite, se usa `resolveMvpPartnerRampIdentity()` (solo org/API). Pasa identidad explícita para cookie `/identidad` o mismo shape desde `getEtherfuseRampContext()`.
 */
export async function executeMvpPartnerOnramp(params: {
  sourceAmount: string;
  amountMxn: number;
  forceNew?: boolean;
  targetAssetIdentifier?: string | null;
  identity?: MvpPartnerRampIdentity;
}): Promise<MvpOnrampResult> {
  const identity =
    params.identity ?? (await resolveMvpPartnerRampIdentity());

  let targetAsset: string;
  if (params.targetAssetIdentifier?.trim()) {
    targetAsset = params.targetAssetIdentifier.trim();
  } else {
    const { assets } = await fetchRampableAssetsForWallet({
      walletPublicKey: identity.publicKey,
    });
    const picked = pickOnrampTargetIdentifier(assets);
    if (!picked) {
      throw new Error(
        "No hay activo destino. Define ETHERFUSE_ONRAMP_TARGET_ASSET (CODE:ISSUER).",
      );
    }
    targetAsset = picked;
  }

  if (params.forceNew) {
    const orders = await fetchOrdersFirstPage();
    const pendingId = findPendingOnrampOrderForAmount(
      orders,
      identity.bankAccountId,
      params.amountMxn,
    );
    if (pendingId) {
      await cancelOrder(pendingId);
    }
  }

  const quote = await createMxOnrampQuote({
    customerId: identity.customerId,
    sourceAmount: params.sourceAmount,
    targetAssetIdentifier: targetAsset,
  });
  const quoteId = quoteIdFromPayload(quote);
  if (!quoteId) {
    throw new Error("Cotización sin quoteId");
  }

  let cryptoWalletId: string | undefined;
  try {
    cryptoWalletId = await resolveMvpPartnerCryptoWalletId(identity.publicKey);
  } catch {
    cryptoWalletId = undefined;
  }

  let orderJson: unknown;
  try {
    orderJson = await createMxOnrampOrder({
      bankAccountId: identity.bankAccountId,
      quoteId,
      ...(cryptoWalletId
        ? { cryptoWalletId }
        : { publicKey: identity.publicKey }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("(409)")) {
      const orders = await fetchOrdersFirstPage();
      const pendingId = findPendingOnrampOrderForAmount(
        orders,
        identity.bankAccountId,
        params.amountMxn,
      );
      if (pendingId) {
        const detail = await fetchOrderDetails(pendingId);
        const dep = depositFromOrderDetail(detail);
        if (dep) {
          return {
            mode: "reused",
            walletPublicKey: identity.publicKey,
            bankAccountId: identity.bankAccountId,
            customerId: identity.customerId,
            targetAsset,
            quote,
            deposit: dep,
            reusedFromPending: true,
          };
        }
      }
    }
    throw e;
  }

  const dep = depositFromCreateOrderResponse(orderJson);
  const text =
    typeof orderJson === "object" && orderJson !== null
      ? JSON.stringify(orderJson)
      : "";
  if (!dep) {
    throw new Error(
      "Orden creada pero sin datos onramp en respuesta: " + text.slice(0, 300),
    );
  }
  return {
    mode: "new",
    walletPublicKey: identity.publicKey,
    bankAccountId: identity.bankAccountId,
    customerId: identity.customerId,
    targetAsset,
    quote,
    deposit: dep,
    reusedFromPending: false,
  };
}
