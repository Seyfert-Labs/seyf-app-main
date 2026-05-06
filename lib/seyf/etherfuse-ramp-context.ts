import { findRampContextFromOrgWallets } from "@/lib/etherfuse/customer-lookup";
import { getEtherfuseOnboardingSession } from "@/lib/etherfuse/onboarding-session";
import { getStoredOnboardingSession, saveStoredOnboardingSession } from "@/lib/seyf/onboarding-session-store";
import { resolveMvpPartnerRampIdentity } from "@/lib/etherfuse/partner-accounts";
import {
  isValidStellarPublicKey,
  normalizeStellarPublicKey,
} from "@/lib/etherfuse/stellar-public-key";
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
 *   `ETHERFUSE_MVP_*` salvo rutas que acepten `useMvpIdentity: true` (p. ej. prueba mxn-cetes forzando solo MVP).
 * - El portal Etherfuse pide «conectar wallet» para firmar; debe ser la **misma** `publicKey` que en Seyf
 *   (`/identidad` o MVP). Seyf no integra Freighter en el browser: la vinculación es servidor vía API + cookie.
 */
export type EtherfuseRampContext = {
  customerId: string;
  publicKey: string;
  bankAccountId: string;
  source: "cookie" | "mvp_env" | "wallet_lookup";
};

/**
 * Igual que {@link getEtherfuseRampContext}, pero en producción puede resolver
 * `customerId` + cuenta bancaria vía GET /ramp/wallets cuando falta la cookie
 * (p. ej. otro dispositivo) si pasas la misma clave Stellar que en Etherfuse.
 *
 * Auto-healing de cookies obsoletas: si el cookie tiene un customerId que ya no
 * corresponde al cliente real de esa wallet (p. ej. porque se guardó el org ID
 * por un bug previo), el wallet lookup lo corrige cuando se provee walletPublicKeyHint.
 */
export async function resolveEtherfuseRampContext(options?: {
  walletPublicKeyHint?: string | null;
}): Promise<EtherfuseRampContext | null> {
  const hint = options?.walletPublicKeyHint?.trim();
  const hintPk =
    hint && isValidStellarPublicKey(normalizeStellarPublicKey(hint))
      ? normalizeStellarPublicKey(hint)
      : null;

  // 1. Redis — fuente de verdad principal (keyed por walletPublicKey)
  if (hintPk) {
    const stored = await getStoredOnboardingSession(hintPk);
    if (stored?.customerId && stored.bankAccountId) {
      return {
        customerId: stored.customerId,
        publicKey: hintPk,
        bankAccountId: stored.bankAccountId,
        source: "wallet_lookup",
      };
    }
  }

  // 2. Cookie httpOnly — fallback si Redis no tiene datos (primera sesión, Redis vacío)
  const session = await getEtherfuseOnboardingSession();
  if (session) {
    const sessionPk = normalizeStellarPublicKey(session.publicKey);

    if (hintPk && sessionPk === hintPk) {
      // Verificar si el Etherfuse API conoce un customerId diferente (cookie stale)
      try {
        const found = await findRampContextFromOrgWallets(hintPk, {
          fallbackBankAccountId: session.bankAccountId,
        });
        if (found?.customerId && found.bankAccountId && found.customerId !== session.customerId) {
          // Cookie stale — guardar en Redis con los IDs correctos
          void saveStoredOnboardingSession({
            customerId: found.customerId,
            bankAccountId: found.bankAccountId,
            walletPublicKey: hintPk,
          });
          return {
            customerId: found.customerId,
            publicKey: hintPk,
            bankAccountId: found.bankAccountId,
            source: "wallet_lookup",
          };
        }
      } catch {
        // network error — usar cookie como está
      }
    }

    // Seed Redis con la cookie válida para requests futuros (sin Redis)
    if (hintPk && sessionPk === hintPk) {
      void saveStoredOnboardingSession({
        customerId: session.customerId,
        bankAccountId: session.bankAccountId,
        walletPublicKey: hintPk,
      });
    }

    return {
      customerId: session.customerId,
      publicKey: session.publicKey,
      bankAccountId: session.bankAccountId,
      source: "cookie",
    };
  }

  // 3. Etherfuse org wallet lookup — dispositivo nuevo sin Redis ni cookie
  if (hintPk) {
    try {
      const found = await findRampContextFromOrgWallets(hintPk);
      if (found?.customerId && found.bankAccountId) {
        // Guardar en Redis para requests futuros
        void saveStoredOnboardingSession({
          customerId: found.customerId,
          bankAccountId: found.bankAccountId,
          walletPublicKey: hintPk,
        });
        return {
          customerId: found.customerId,
          publicKey: hintPk,
          bankAccountId: found.bankAccountId,
          source: "wallet_lookup",
        };
      }
    } catch {
      // sin contexto
    }
  }

  if (process.env.NODE_ENV === "production") {
    return null;
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

export async function getEtherfuseRampContext(): Promise<EtherfuseRampContext | null> {
  return resolveEtherfuseRampContext();
}
