import { etherfuseFetch, etherfuseReadBody } from "./client";
import { findRampContextByWalletPublicKey } from "./customer-lookup";
import { normalizeStellarPublicKey } from "./stellar-public-key";

type Paged<T> = {
  items?: T[];
  totalItems?: number;
};

function idFromBankRow(row: Record<string, unknown>): string | undefined {
  if (typeof row.bankAccountId === "string") return row.bankAccountId;
  if (typeof row.bank_account_id === "string") return row.bank_account_id;
  if (typeof row.id === "string") return row.id;
  return undefined;
}

/** Cuentas con `deletedAt` siguen en GET /ramp/bank-accounts pero no sirven para órdenes (error confuso "Proxy account not found"). */
function isBankRowActive(row: Record<string, unknown>): boolean {
  return row.deletedAt == null;
}

function walletRow(
  row: Record<string, unknown>,
): { publicKey?: string; blockchain?: string } {
  const pk =
    typeof row.publicKey === "string"
      ? row.publicKey
      : typeof row.public_key === "string"
        ? row.public_key
        : undefined;
  const bc =
    typeof row.blockchain === "string"
      ? row.blockchain
      : typeof row.blockChain === "string"
        ? row.blockChain
        : undefined;
  return { publicKey: pk, blockchain: bc };
}

function walletIdFromRow(row: Record<string, unknown>): string | undefined {
  if (typeof row.walletId === "string") return row.walletId;
  if (typeof row.wallet_id === "string") return row.wallet_id;
  if (typeof row.id === "string") return row.id;
  return undefined;
}

/**
 * UUID de `POST /ramp/wallet` / GET `/ramp/wallets`. En Stellar, la orden debe usar
 * `cryptoWalletId` para que Etherfuse resuelva la cuenta proxy; solo `publicKey` puede dar
 * "Proxy account not found".
 */
export async function resolveMvpPartnerCryptoWalletId(
  stellarPublicKey: string,
): Promise<string> {
  const env = process.env.ETHERFUSE_MVP_CRYPTO_WALLET_ID?.trim();
  if (env) return env;

  const res = await etherfuseFetch("/ramp/wallets", { method: "GET" });
  const { json, text } = await etherfuseReadBody<Paged<Record<string, unknown>>>(
    res,
  );
  if (!res.ok) {
    throw new Error(`Etherfuse /ramp/wallets (${res.status}): ${text.slice(0, 400)}`);
  }
  const target = normalizeStellarPublicKey(stellarPublicKey);
  for (const row of json?.items ?? []) {
    const { publicKey, blockchain } = walletRow(row);
    if ((blockchain ?? "").toLowerCase() !== "stellar") continue;
    if (typeof publicKey !== "string") continue;
    if (normalizeStellarPublicKey(publicKey) !== target) continue;
    const wid = walletIdFromRow(row);
    if (wid) return wid;
  }
  throw new Error(
    "No hay cryptoWalletId en /ramp/wallets para esta clave Stellar. Registra la wallet en Etherfuse o define ETHERFUSE_MVP_CRYPTO_WALLET_ID (UUID).",
  );
}

/**
 * Cuenta Stellar y cuenta bancaria registradas en Etherfuse para esta API key (GET /ramp/wallets, GET /ramp/bank-accounts).
 */
export async function fetchPartnerStellarWalletPublicKey(): Promise<string> {
  const env = process.env.ETHERFUSE_MVP_STELLAR_PUBLIC_KEY?.trim();
  if (env) return normalizeStellarPublicKey(env);

  const res = await etherfuseFetch("/ramp/wallets", { method: "GET" });
  const { json, text } = await etherfuseReadBody<Paged<Record<string, unknown>>>(
    res,
  );
  if (!res.ok) {
    throw new Error(`Etherfuse /ramp/wallets (${res.status}): ${text.slice(0, 400)}`);
  }
  const items = json?.items ?? [];
  for (const row of items) {
    const { publicKey, blockchain } = walletRow(row);
    if (
      typeof publicKey === "string" &&
      (blockchain ?? "").toLowerCase() === "stellar"
    ) {
      return normalizeStellarPublicKey(publicKey);
    }
  }
  throw new Error(
    "No hay wallet Stellar en /ramp/wallets. Registra una en Etherfuse o define ETHERFUSE_MVP_STELLAR_PUBLIC_KEY.",
  );
}

/**
 * Primera CLABE activa, o una de `preferred` si sigue activa en la API.
 * Ignora `ETHERFUSE_MVP_BANK_ACCOUNT_ID` si apunta a una cuenta borrada (soft-delete).
 */
export async function fetchPartnerBankAccountId(
  preferredIds?: string[],
): Promise<string> {
  const res = await etherfuseFetch("/ramp/bank-accounts", { method: "GET" });
  const { json, text } = await etherfuseReadBody<Paged<Record<string, unknown>>>(
    res,
  );
  if (!res.ok) {
    throw new Error(
      `Etherfuse /ramp/bank-accounts (${res.status}): ${text.slice(0, 400)}`,
    );
  }
  const active = (json?.items ?? []).filter(isBankRowActive);
  for (const pref of preferredIds ?? []) {
    const p = pref?.trim();
    if (!p) continue;
    const hit = active.find((row) => idFromBankRow(row) === p);
    if (hit) {
      const id = idFromBankRow(hit);
      if (id) return id;
    }
  }
  for (const row of active) {
    const id = idFromBankRow(row);
    if (id) return id;
  }
  throw new Error(
    "No hay cuentas bancarias activas en /ramp/bank-accounts. Registra una CLABE en Etherfuse o revisa que ETHERFUSE_MVP_BANK_ACCOUNT_ID no sea una cuenta eliminada.",
  );
}

export type MvpPartnerRampIdentity = {
  customerId: string;
  bankAccountId: string;
  publicKey: string;
};

/**
 * Resuelve customerId (cotización) + bankAccountId + wallet para rampa MVP usando solo la API / env.
 * - `customerId`: prioridad al cliente que devuelve la API para esta wallet (`findRampContextByWalletPublicKey`), no al .env (evita quotes con customerId obsoleto).
 * - `bankAccountId`: prioridad env y lookup, pero solo si la cuenta sigue **activa** en GET /ramp/bank-accounts (sin `deletedAt`).
 */
export async function resolveMvpPartnerRampIdentity(): Promise<MvpPartnerRampIdentity> {
  const envCustomer = process.env.ETHERFUSE_MVP_CUSTOMER_ID?.trim();
  const envBank = process.env.ETHERFUSE_MVP_BANK_ACCOUNT_ID?.trim();
  const publicKey = await fetchPartnerStellarWalletPublicKey();
  const ctx = await findRampContextByWalletPublicKey(publicKey);

  const bankAccountId = await fetchPartnerBankAccountId(
    [envBank, ctx?.bankAccountId].filter((x): x is string => Boolean(x?.trim())),
  );

  const customerId = ctx?.customerId ?? envCustomer;
  if (!customerId) {
    throw new Error(
      "No se encontró customerId para esta wallet. Completa onboarding en Etherfuse o define ETHERFUSE_MVP_CUSTOMER_ID en .env.local.",
    );
  }

  return { customerId, bankAccountId, publicKey };
}
