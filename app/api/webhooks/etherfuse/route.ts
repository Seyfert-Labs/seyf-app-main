import { NextResponse } from "next/server";
import type { EtherfuseKycStatus } from "@/lib/etherfuse/kyc";
import { getEtherfuseConfig, strictEtherfuseProductionConfig } from "@/lib/etherfuse/config";
import { verifyEtherfuseWebhookSignature } from "@/lib/etherfuse/webhook-verify";
import { pickRampOrderTransactionDetails } from "@/lib/etherfuse/orders-api";
import { enqueueAutoDeployForDeposit } from "@/lib/seyf/spei-deposit-auto-deploy";

export const runtime = "nodejs";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isKycStatus(value: string): value is EtherfuseKycStatus {
  return (
    value === "not_started" ||
    value === "proposed" ||
    value === "approved" ||
    value === "approved_chain_deploying" ||
    value === "rejected"
  );
}

function extractKycUpdateEvent(payload: unknown): {
  eventType: string | null;
  eventId: string | null;
  eventTimestamp: string | null;
  customerId: string | null;
  walletPublicKey: string | null;
  status: EtherfuseKycStatus | null;
  approvedAt: string | null;
  currentRejectionReason: string | null;
} {
  const root = asObject(payload) ?? {};
  const data = asObject(root.data) ?? asObject(root.payload) ?? root;
  const eventType = pickString(root, ["event", "eventType", "type", "name"]);
  const eventId = pickString(root, ["id", "eventId", "webhookId"]);
  const eventTimestamp = pickString(root, ["createdAt", "timestamp", "occurredAt"]);
  const customerId = pickString(data, ["customerId", "customer_id"]);
  const walletPublicKey = pickString(data, ["walletPublicKey", "wallet_public_key", "pubkey", "publicKey"]);
  const statusRaw = pickString(data, ["status"]);
  const approvedAt = pickString(data, ["approvedAt", "approved_at"]);
  const currentRejectionReason = pickString(data, ["currentRejectionReason", "current_rejection_reason"]);
  return {
    eventType,
    eventId,
    eventTimestamp,
    customerId,
    walletPublicKey,
    status: statusRaw && isKycStatus(statusRaw) ? statusRaw : null,
    approvedAt,
    currentRejectionReason,
  };
}

/**
 * POST /api/webhooks/etherfuse
 * Configura la URL en devnet (Ramp → Webhooks) apuntando a tu dominio + esta ruta.
 * Secreto en ETHERFUSE_WEBHOOK_SECRET (base64, el que devuelve create webhook una sola vez).
 *
 * @see https://docs.etherfuse.com/guides/verifying-webhooks
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    let payload: unknown;
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { webhookSecret: secret } = getEtherfuseConfig();
    const sig = req.headers.get("x-signature");

    if (secret) {
      if (!verifyEtherfuseWebhookSignature(payload, sig, secret)) {
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    } else if (strictEtherfuseProductionConfig()) {
      return NextResponse.json(
        { error: "ETHERFUSE_WEBHOOK_SECRET no configurado" },
        { status: 503 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[webhook etherfuse]",
        typeof payload === "object" && payload !== null
          ? JSON.stringify(payload).slice(0, 2500)
          : String(payload),
      );
    }

    const kyc = extractKycUpdateEvent(payload);
    const isKycUpdated =
      kyc.eventType === "kyc_updated" ||
      (kyc.eventType && kyc.eventType.toLowerCase().includes("kyc"));
    if (isKycUpdated && kyc.customerId && kyc.walletPublicKey && kyc.status) {
      const result = await upsertStoredKycSnapshot({
        customerId: kyc.customerId,
        walletPublicKey: kyc.walletPublicKey,
        status: kyc.status,
        approvedAt: kyc.approvedAt,
        currentRejectionReason: kyc.currentRejectionReason,
        eventId: kyc.eventId,
        eventTimestamp: kyc.eventTimestamp,
      });
      if (process.env.NODE_ENV !== "production") {
        console.info("[webhook etherfuse] kyc_updated processed", {
          customerId: kyc.customerId,
          walletPublicKey: `${kyc.walletPublicKey.slice(0, 6)}...${kyc.walletPublicKey.slice(-6)}`,
          status: kyc.status,
          updated: result.updated,
        });
      }
    }

  try {
    const details = pickRampOrderTransactionDetails(payload);
    const isOnramp = (details.orderType ?? "").toLowerCase() === "onramp";
    const isConfirmed = (details.status ?? "").toLowerCase() === "confirmed";

    if (isOnramp && isConfirmed && details.orderId) {
      void enqueueAutoDeployForDeposit({
        depositId: details.orderId,
        amountMxn:
          details.amountInFiat && Number.isFinite(Number(details.amountInFiat))
            ? Number(details.amountInFiat)
            : null,
      }).catch((error) => {
        console.error("[webhook etherfuse] enqueueAutoDeployForDeposit failed", error);
      });
    }
  } catch (error) {
    console.error("[webhook etherfuse] handler error", error);
  }

  return NextResponse.json({ ok: true });
}
