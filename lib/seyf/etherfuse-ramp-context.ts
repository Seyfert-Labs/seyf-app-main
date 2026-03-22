import { getEtherfuseOnboardingSession } from "@/lib/etherfuse/onboarding-session";
import { resolveMvpPartnerRampIdentity } from "@/lib/etherfuse/partner-accounts";
import { isEtherfuseDevPanelEnabled } from "@/lib/seyf/etherfuse-dev-panel";

/**
 * Cookie /identidad o, en dev/panel, identidad MVP desde env + GET /ramp/wallets (misma lógica que Depositar).
 *
 * Avisos sobre la cookie `seyf_ef_onboarding`:
 * - Está ligada a la **misma API key** que usa el servidor (`ETHERFUSE_API_KEY`). Si cambias de clave u org,
 *   borra la cookie (p. ej. «Reiniciar prueba» en /identidad) o los UUIDs apuntan a otro tenant.
 * - Si el usuario no terminó KYC / términos / CLABE en Etherfuse, la API puede rechazar cotización u orden
 *   aunque la cookie sea válida; [devnet](https://devnet.etherfuse.com/ramp) puede mostrar otro estado que la API.
 * - `getEtherfuseRampContext` **prioriza siempre la cookie** sobre MVP: con cookie presente no se usan
 *   `ETHERFUSE_MVP_*` salvo rutas que acepten `useMvpIdentity` (p. ej. prueba mxn-cetes).
 */
export type EtherfuseRampContext = {
  customerId: string;
  publicKey: string;
  bankAccountId: string;
  source: "cookie" | "mvp_env";
};

export async function getEtherfuseRampContext(): Promise<EtherfuseRampContext | null> {
  const session = await getEtherfuseOnboardingSession();
  if (session) {
    return {
      customerId: session.customerId,
      publicKey: session.publicKey,
      bankAccountId: session.bankAccountId,
      source: "cookie",
    };
  }
  if (!isEtherfuseDevPanelEnabled()) {
    return null;
  }
  try {
    const m = await resolveMvpPartnerRampIdentity();
    return {
      customerId: m.customerId,
      publicKey: m.publicKey,
      bankAccountId: m.bankAccountId,
      source: "mvp_env",
    };
  } catch {
    return null;
  }
}
