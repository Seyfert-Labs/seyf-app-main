import { findRampContextByWalletPublicKey } from "./customer-lookup";
import { etherfuseFetch, etherfuseReadBody } from "./client";
import {
  getEtherfuseDefaultBlockchain,
  type EtherfuseBlockchain,
} from "./integration-model";

export type GenerateOnboardingUrlParams = {
  customerId: string;
  bankAccountId: string;
  publicKey: string;
  blockchain?: EtherfuseBlockchain;
};

type OnboardingUrlResponse = {
  presigned_url?: string;
  error?: string;
};

/**
 * Crea el cliente en Etherfuse (si no existe) y devuelve la URL de onboarding (hosted o inicio de flujo programático).
 * La URL expira en ~15 minutos.
 *
 * @see https://docs.etherfuse.com/api-reference/onboarding/generate-onboarding-url
 */
export async function generateOnboardingPresignedUrl(
  params: GenerateOnboardingUrlParams,
): Promise<{ presignedUrl: string }> {
  const blockchain = params.blockchain ?? getEtherfuseDefaultBlockchain();
  const res = await etherfuseFetch("/ramp/onboarding-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: params.customerId,
      bankAccountId: params.bankAccountId,
      publicKey: params.publicKey,
      blockchain,
    }),
  });

  const { json: raw, text } = await etherfuseReadBody<OnboardingUrlResponse>(res);
  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && "error" in raw && typeof raw.error === "string"
        ? raw.error
        : text.slice(0, 500);
    throw new Error(`Etherfuse onboarding-url falló (${res.status}): ${msg}`);
  }
  if (!raw || typeof raw !== "object") {
    throw new Error(
      `Etherfuse onboarding-url: respuesta no JSON (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  const presignedUrl = raw.presigned_url;
  if (!presignedUrl || typeof presignedUrl !== "string") {
    throw new Error(
      "Respuesta onboarding-url sin presigned_url: " + text.slice(0, 500),
    );
  }
  return { presignedUrl };
}

function isWalletAlreadyRegisteredError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    message.includes("409") &&
    (m.includes("already added") || m.includes("already registered"))
  );
}

/**
 * Igual que {@link generateOnboardingPresignedUrl}, pero ante 409 por wallet ya existente
 * resuelve customerId / bankAccountId en la API y reintenta una vez.
 * Devuelve los IDs que aplicaron al request exitoso (para persistir en sesión).
 */
export async function generateOnboardingPresignedUrlResolving409(
  params: GenerateOnboardingUrlParams,
): Promise<{
  presignedUrl: string;
  customerId: string;
  bankAccountId: string;
}> {
  try {
    const { presignedUrl } = await generateOnboardingPresignedUrl(params);
    return {
      presignedUrl,
      customerId: params.customerId,
      bankAccountId: params.bankAccountId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!isWalletAlreadyRegisteredError(message)) throw e;
    const ctx = await findRampContextByWalletPublicKey(params.publicKey);
    if (!ctx) throw e;
    const { presignedUrl } = await generateOnboardingPresignedUrl({
      ...params,
      customerId: ctx.customerId,
      bankAccountId: ctx.bankAccountId,
    });
    return {
      presignedUrl,
      customerId: ctx.customerId,
      bankAccountId: ctx.bankAccountId,
    };
  }
}
