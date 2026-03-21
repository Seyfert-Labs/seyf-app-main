import { etherfuseFetch, etherfuseReadBody } from "./client";

/** Estados según https://docs.etherfuse.com/guides/onboarding#checking-kyc-status */
export type EtherfuseKycStatus =
  | "not_started"
  | "proposed"
  | "approved"
  | "approved_chain_deploying"
  | "rejected";

/** Perfil legible derivado de `currentKycInfo` en GET KYC (Etherfuse). */
export type EtherfuseKycVerifiedProfile = {
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  addressLine: string | null;
};

export type EtherfuseKycSnapshot = {
  customerId: string;
  walletPublicKey: string;
  status: EtherfuseKycStatus;
  approvedAt: string | null;
  currentRejectionReason: string | null;
  verifiedProfile: EtherfuseKycVerifiedProfile | null;
};

type KycApiBody = {
  customerId?: string;
  walletPublicKey?: string;
  status?: string;
  approvedAt?: string | null;
  currentRejectionReason?: string | null;
  currentKycInfo?: unknown;
};

function parseVerifiedProfileFromKycJson(
  json: Record<string, unknown>,
): EtherfuseKycVerifiedProfile | null {
  const raw = json.currentKycInfo;
  if (!raw || typeof raw !== "object") return null;
  const i = raw as Record<string, unknown>;

  let fullName: string | null = null;
  if (i.name && typeof i.name === "object" && i.name !== null) {
    const n = i.name as Record<string, unknown>;
    const given = typeof n.givenName === "string" ? n.givenName.trim() : "";
    const family = typeof n.familyName === "string" ? n.familyName.trim() : "";
    const combined = [given, family].filter(Boolean).join(" ").trim();
    fullName = combined.length > 0 ? combined : null;
  }

  let addressLine: string | null = null;
  if (i.address && typeof i.address === "object" && i.address !== null) {
    const a = i.address as Record<string, unknown>;
    const parts = [a.street, a.city, a.region, a.postalCode, a.country]
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    addressLine = parts.length > 0 ? parts.join(", ") : null;
  }

  const email = typeof i.email === "string" && i.email.trim() ? i.email.trim() : null;
  const phoneNumber =
    typeof i.phoneNumber === "string" && i.phoneNumber.trim()
      ? i.phoneNumber.trim()
      : null;

  if (!fullName && !email && !phoneNumber && !addressLine) return null;

  return { fullName, email, phoneNumber, addressLine };
}

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
  const asRecord = json as Record<string, unknown>;
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
      verifiedProfile: parseVerifiedProfileFromKycJson(asRecord),
    },
  };
}
