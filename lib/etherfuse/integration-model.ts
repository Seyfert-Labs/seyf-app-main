import { randomUUID } from "node:crypto";

/**
 * Modelo de integración Seyf ↔ Etherfuse (paso 2 del checklist).
 *
 * - **Organización partner (tú):** identificada por la API key (`GET /ramp/me` → org "seyf").
 *   No es el ID que pasas como `customerId`.
 * - **Usuario final (cliente ramp):** Etherfuse crea el registro de cliente cuando llamas
 *   `POST /ramp/onboarding-url` con UUIDs que **generas tú**: `customerId` y `bankAccountId`,
 *   más la wallet Stellar (`publicKey` + `blockchain: stellar`). Debes persistir en tu DB:
 *   `seyf_user_id` → `etherfuse_customer_id`, `etherfuse_bank_account_id`, `stellar_public_key`.
 * - **Child org (`POST /ramp/organization`):** sub-organizaciones con flujo de aprobación KYB aparte.
 *   En el MVP retail de Seyf **no** es el camino por usuario; sirve para partners/negocios, no para cada ahorrador.
 *
 * Onboarding:
 * - **hosted** (default): UI de Etherfuse vía URL firmada — más rápido para validar el MVP ([guía](https://docs.etherfuse.com/guides/onboarding-hosted)).
 * - **programmatic:** KYC en tu UI + API ([guía](https://docs.etherfuse.com/guides/onboarding-programmatic)); el flujo igual arranca con
 *   `onboarding-url` para crear cliente y obtener token de acuerdos.
 *
 * @see https://docs.etherfuse.com/guides/onboarding
 */

export const ETHERFUSE_BLOCKCHAINS = [
  "solana",
  "stellar",
  "base",
  "polygon",
  "monad",
] as const;

export type EtherfuseBlockchain = (typeof ETHERFUSE_BLOCKCHAINS)[number];

export type EtherfuseOnboardingMode = "hosted" | "programmatic";

export function getEtherfuseOnboardingMode(): EtherfuseOnboardingMode {
  const v = process.env.ETHERFUSE_ONBOARDING_MODE?.trim().toLowerCase();
  if (v === "programmatic") return "programmatic";
  return "hosted";
}

/** MVP Seyf: solo Stellar (MXNe / Stablebonds). */
export function getEtherfuseDefaultBlockchain(): EtherfuseBlockchain {
  const v = process.env.ETHERFUSE_DEFAULT_BLOCKCHAIN?.trim().toLowerCase();
  if (
    v &&
    (ETHERFUSE_BLOCKCHAINS as readonly string[]).includes(v)
  ) {
    return v as EtherfuseBlockchain;
  }
  return "stellar";
}

/** UUIDs nuevos para una sesión de onboarding (customer + cuenta bancaria lógica en Etherfuse). */
export function newEtherfuseOnboardingIds(): {
  customerId: string;
  bankAccountId: string;
} {
  return {
    customerId: randomUUID(),
    bankAccountId: randomUUID(),
  };
}
