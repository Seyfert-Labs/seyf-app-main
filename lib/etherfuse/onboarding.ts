import { etherfuseFetch } from "./client";
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

  const raw = (await res.json()) as OnboardingUrlResponse;
  if (!res.ok) {
    throw new Error(
      raw.error ??
        `Etherfuse onboarding-url falló (${res.status}): ${JSON.stringify(raw)}`,
    );
  }
  const presignedUrl = raw.presigned_url;
  if (!presignedUrl || typeof presignedUrl !== "string") {
    throw new Error(
      "Respuesta onboarding-url sin presigned_url: " + JSON.stringify(raw),
    );
  }
  return { presignedUrl };
}
