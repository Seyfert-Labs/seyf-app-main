import { etherfuseFetch, etherfuseReadBody, extractEtherfuseErrorMessage } from "@/lib/etherfuse/client";

export type EtherfuseWallet = {
  walletId: string;
  customerId: string;
  publicKey: string;
  blockchain: string;
  kycStatus?: string;
  claimedOwnership?: boolean;
};

/**
 * POST /ramp/wallet
 * Registra una wallet a nivel organización partner.
 * Es idempotente según docs (si ya existe, devuelve el registro actual).
 */
export async function registerOrganizationWallet(params: {
  publicKey: string;
  blockchain?: "stellar" | "solana" | "base" | "polygon" | "monad";
  claimOwnership?: boolean;
}): Promise<EtherfuseWallet> {
  const res = await etherfuseFetch("/ramp/wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: params.publicKey,
      blockchain: params.blockchain ?? "stellar",
      claimOwnership: params.claimOwnership ?? true,
    }),
    retryable: false,
  });
  const { json, text } = await etherfuseReadBody<EtherfuseWallet | { error?: string }>(res);
  if (!res.ok) {
    /** Algunos entornos devuelven 409 con el objeto wallet en el cuerpo (idempotente). */
    if (
      res.status === 409 &&
      json &&
      typeof json === "object" &&
      "walletId" in json &&
      typeof (json as EtherfuseWallet).walletId === "string" &&
      "customerId" in json &&
      typeof (json as EtherfuseWallet).customerId === "string"
    ) {
      return json as EtherfuseWallet;
    }
    const msg = extractEtherfuseErrorMessage(json, text, 500);
    throw new Error(`Etherfuse register wallet failed (${res.status}): ${msg}`);
  }
  if (!json || typeof json !== "object" || !("walletId" in json)) {
    throw new Error(`Etherfuse register wallet returned invalid payload: ${text.slice(0, 500)}`);
  }
  return json as EtherfuseWallet;
}

/**
 * `POST /ramp/wallet` puede devolver 409 si la wallet ya está en la org (p. ej. reintento tras borrar CLABE).
 * En ese caso el flujo KYC debe seguir: `onboarding-url` + lookup resuelven el `customerId` real.
 */
export function isRecoverableRegisterWalletConflict(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const m = msg.toLowerCase();
  if (!m.includes("register wallet")) return false;
  return (
    msg.includes("(409)") ||
    m.includes("already added") ||
    m.includes("already exists") ||
    m.includes("already registered") ||
    m.includes("duplicate")
  );
}
