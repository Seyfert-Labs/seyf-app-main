import { pickOnrampDepositSummary } from "@/lib/etherfuse/order-create-response";

export type SpeiTransferDetails = {
  orderId: string;
  clabe: string;
  amountMxn: number;
  assetCode: string;
  beneficiaryName: string;
};

export function formatSpeiMxnAmount(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

export function assetCodeFromIdentifier(identifier: string): string {
  const s = identifier.trim();
  if (!s) return "activo";
  const i = s.indexOf(":");
  return (i === -1 ? s : s.slice(0, i)).trim() || "activo";
}

/** Respuesta de `POST .../mxn-cetes` con `prepareOnly` (u orden completa). */
export function speiDetailsFromMxnCetesApiResponse(
  data: unknown,
  beneficiaryFallback = "Etherfuse",
): SpeiTransferDetails | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const benefRaw = root.speiRecipientDisplayName;
  const benef =
    typeof benefRaw === "string" && benefRaw.trim()
      ? benefRaw.trim()
      : beneficiaryFallback;
  const ramp = root.ramp;
  if (!ramp || typeof ramp !== "object") return null;
  const deposit = (ramp as { deposit?: unknown }).deposit;
  if (!deposit || typeof deposit !== "object") return null;
  const d = deposit as Record<string, unknown>;
  const orderId = typeof d.orderId === "string" ? d.orderId : "";
  const clabe = typeof d.clabe === "string" ? d.clabe : "";
  const rawAmt = d.depositAmount;
  const amountMxn =
    typeof rawAmt === "number" && Number.isFinite(rawAmt)
      ? rawAmt
      : typeof rawAmt === "string"
        ? Number.parseFloat(rawAmt)
        : Number.NaN;
  if (!orderId || !clabe || !Number.isFinite(amountMxn)) return null;
  const tid =
    typeof root.targetAssetUsed === "string" ? root.targetAssetUsed : "";
  return {
    orderId,
    clabe,
    amountMxn,
    assetCode: assetCodeFromIdentifier(tid),
    beneficiaryName: benef,
  };
}

/** Cuerpo típico `{ order, orderId }` tras POST order onramp. */
export function speiDetailsFromOnrampOrderApiJson(
  orderApiJson: string,
  assetLabel: string,
  beneficiaryName: string,
): SpeiTransferDetails | null {
  let root: unknown;
  try {
    root = JSON.parse(orderApiJson) as unknown;
  } catch {
    return null;
  }
  const order =
    root && typeof root === "object" && root !== null && "order" in root
      ? (root as { order: unknown }).order
      : root;
  const s = pickOnrampDepositSummary(order);
  if (!s.depositClabe || !s.orderId || s.depositAmount == null) return null;
  const n = Number.parseFloat(String(s.depositAmount).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return {
    orderId: s.orderId,
    clabe: s.depositClabe,
    amountMxn: n,
    assetCode: assetLabel.trim() || "activo",
    beneficiaryName,
  };
}
