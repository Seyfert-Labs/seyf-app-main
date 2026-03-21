import { etherfuseFetch, etherfuseReadBody } from "./client";

/** Estados según https://docs.etherfuse.com/guides/onboarding#checking-kyc-status */
export type EtherfuseKycStatus =
  | "not_started"
  | "proposed"
  | "approved"
  | "approved_chain_deploying"
  | "rejected";

export type EtherfuseKycSnapshot = {
  customerId: string;
  walletPublicKey: string;
  status: EtherfuseKycStatus;
  approvedAt: string | null;
  currentRejectionReason: string | null;
};

type KycApiBody = {
  customerId?: string;
  walletPublicKey?: string;
  status?: string;
  approvedAt?: string | null;
  currentRejectionReason?: string | null;
};

function isKycStatus(s: string): s is EtherfuseKycStatus {
  return (
    s === "not_started" ||
    s === "proposed" ||
    s === "approved" ||
    s === "approved_chain_deploying" ||
    s === "rejected"
  );
}

/**
 * GET /ramp/customer/{customer_id}/kyc/{pubkey}
 * @see https://docs.etherfuse.com/api-reference/kyc/get-kyc-status
 */
export async function fetchEtherfuseKycStatus(
  customerId: string,
  walletPublicKey: string,
): Promise<
  | { ok: true; data: EtherfuseKycSnapshot }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid_body" }
> {
  const path = `/ramp/customer/${encodeURIComponent(customerId)}/kyc/${encodeURIComponent(walletPublicKey)}`;
  const res = await etherfuseFetch(path, { method: "GET" });
  const { json, text } = await etherfuseReadBody<KycApiBody>(res);

  if (res.status === 404) {
    return { ok: false, reason: "not_found" };
  }
  if (!res.ok) {
    throw new Error(
      `Etherfuse KYC status falló (${res.status}): ${text.slice(0, 400)}`,
    );
  }
  if (!json || typeof json !== "object") {
    return { ok: false, reason: "invalid_body" };
  }
  const statusRaw = json.status;
  if (typeof statusRaw !== "string" || !isKycStatus(statusRaw)) {
    return { ok: false, reason: "invalid_body" };
  }
  const cid = json.customerId;
  const wpk = json.walletPublicKey;
  if (typeof cid !== "string" || typeof wpk !== "string") {
    return { ok: false, reason: "invalid_body" };
  }
  return {
    ok: true,
    data: {
      customerId: cid,
      walletPublicKey: wpk,
      status: statusRaw,
      approvedAt:
        json.approvedAt === null || json.approvedAt === undefined
          ? null
          : String(json.approvedAt),
      currentRejectionReason:
        json.currentRejectionReason == null
          ? null
          : String(json.currentRejectionReason),
    },
  };
}
