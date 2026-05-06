import { findRampContextFromOrgWallets } from "@/lib/etherfuse/customer-lookup";
import { getEtherfuseOnboardingSession } from "@/lib/etherfuse/onboarding-session";
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
  const session = await getEtherfuseOnboardingSession();

  const hint = options?.walletPublicKeyHint?.trim();
  const hintPk =
    hint && isValidStellarPublicKey(normalizeStellarPublicKey(hint))
      ? normalizeStellarPublicKey(hint)
      : null;

  // When we have both a session cookie AND a wallet hint for the same public key,
  // verify the cookie's customerId via wallet lookup to catch stale cookies
  // (e.g. org ID stored by a previous bug). Prefer the lookup result if they differ.
  if (session) {
    if (hintPk && normalizeStellarPublicKey(session.publicKey) === hintPk) {
      try {
        const found = await findRampContextFromOrgWallets(hintPk);
        if (found?.customerId && found.bankAccountId) {
          if (found.customerId !== session.customerId) {
            // Cookie has a stale/wrong customerId — use the real one from API
            return {
              customerId: found.customerId,
              publicKey: hintPk,
              bankAccountId: found.bankAccountId,
              source: "wallet_lookup",
            };
          }
          // IDs match — cookie is valid, fall through to return it
        } else {
          // Wallet exists in Etherfuse but has no customer in the current org.
          // The cookie is likely stale (from a previous org). Return null so the
          // caller knows the user must re-complete /identidad in the current org.
          return null;
        }
      } catch {
        // Lookup failed (network error) — fall through to cookie as-is
      }
    }
    return {
      customerId: session.customerId,
      publicKey: session.publicKey,
      bankAccountId: session.bankAccountId,
      source: "cookie",
    };
  }

  if (hintPk) {
    try {
      const found = await findRampContextFromOrgWallets(hintPk);
      if (found?.customerId && found.bankAccountId) {
        return {
          customerId: found.customerId,
          publicKey: hintPk,
          bankAccountId: found.bankAccountId,
          source: "wallet_lookup",
        };
      }
    } catch {
      // sin contexto org/wallet
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
