import { z } from "zod";
import { etherfuseFetch, etherfuseReadBody } from "./client";
import { normalizeStellarPublicKey } from "./stellar-public-key";

const PAGE_SIZE = 100;
const MAX_CUSTOMER_PAGES = 20;

type CustomersList = { items?: { customerId?: string }[] };
type WalletsList = { items?: { publicKey?: string }[] };
type BankAccountsList = { items?: { bankAccountId?: string }[] };
type OrgWalletsList = { items?: Record<string, unknown>[] };

function sameWalletKey(a: string, b: string): boolean {
  return normalizeStellarPublicKey(a) === normalizeStellarPublicKey(b);
}

export type FindRampContextOptions = {
  /**
   * UUID de cuenta bancaria que Seyf ya generó para esta sesión. Si la wallet ya existe en Etherfuse
   * pero aún no hay ninguna cuenta bancaria (antes de CLABE), la API no devuelve `bankAccountId`;
   * en ese caso reutilizamos `customerId` de Etherfuse + este UUID para reintentar `onboarding-url`.
   */
  fallbackBankAccountId?: string;
};

/**
 * Cuando onboarding-url devuelve 409 (wallet ya registrada), hay que reutilizar el customerId
 * real de Etherfuse, no UUIDs nuevos. Recorre clientes y wallets de la org de la API key.
 *
 * @see flujo similar en la guía interactiva de https://docs.etherfuse.com/guides/onboarding
 */
export async function findRampContextByWalletPublicKey(
  publicKey: string,
  opts?: FindRampContextOptions,
): Promise<{ customerId: string; bankAccountId: string } | null> {
  const target = normalizeStellarPublicKey(publicKey);

  for (let pageNumber = 0; pageNumber < MAX_CUSTOMER_PAGES; pageNumber++) {
    const res = await etherfuseFetch("/ramp/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageSize: PAGE_SIZE, pageNumber }),
    });
    const { json, text } = await etherfuseReadBody<CustomersList>(res);
    if (!res.ok) {
      throw new Error(
        `Etherfuse /ramp/customers falló (${res.status}): ${text.slice(0, 400)}`,
      );
    }
    const customers = json?.items ?? [];

    for (const row of customers) {
      const customerId = row.customerId;
      if (!customerId) continue;

      const wRes = await etherfuseFetch(
        `/ramp/customer/${customerId}/wallets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageSize: PAGE_SIZE, pageNumber: 0 }),
        },
      );
      const { json: wJson, text: wText } =
        await etherfuseReadBody<WalletsList>(wRes);
      if (!wRes.ok) continue;

      const wallets = wJson?.items ?? [];
      const match = wallets.find(
        (w) =>
          typeof w.publicKey === "string" &&
          sameWalletKey(w.publicKey, target),
      );
      if (!match) continue;

      const bRes = await etherfuseFetch(
        `/ramp/customer/${customerId}/bank-accounts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageSize: PAGE_SIZE, pageNumber: 0 }),
        },
      );
      const { json: bJson } = await etherfuseReadBody<BankAccountsList>(bRes);
      const first =
        bRes.ok && bJson?.items?.length
          ? bJson.items[0]?.bankAccountId
          : undefined;
      const bankAccountId =
        typeof first === "string" && first.length > 0 ? first : null;
      if (bankAccountId) {
        return { customerId, bankAccountId };
      }

      const fallback = z
        .string()
        .uuid()
        .safeParse(opts?.fallbackBankAccountId?.trim());
      if (fallback.success) {
        return { customerId, bankAccountId: fallback.data };
      }

      return null;
    }

    if (customers.length < PAGE_SIZE) break;
  }

  return null;
}

/**
 * Resolución alternativa: `GET /ramp/wallets` a nivel org suele incluir `customerId` por fila.
 * Útil cuando el paseo por `/ramp/customers` no encuentra la wallet (paginación / timing).
 */
export async function findRampContextFromOrgWallets(
  publicKey: string,
  opts?: FindRampContextOptions,
): Promise<{ customerId: string; bankAccountId: string } | null> {
  const res = await etherfuseFetch("/ramp/wallets", { method: "GET" });
  const { json } = await etherfuseReadBody<OrgWalletsList>(res);
  if (!res.ok) return null;

  const target = normalizeStellarPublicKey(publicKey);
  for (const row of json?.items ?? []) {
    const pk =
      typeof row.publicKey === "string"
        ? row.publicKey
        : typeof row.public_key === "string"
          ? row.public_key
          : null;
    if (!pk) continue;
    const bc = String(
      typeof row.blockchain === "string"
        ? row.blockchain
        : typeof row.blockChain === "string"
          ? row.blockChain
          : "",
    ).toLowerCase();
    if (bc && bc !== "stellar") continue;
    if (!sameWalletKey(pk, target)) continue;

    const customerId =
      typeof row.customerId === "string"
        ? row.customerId
        : typeof row.customer_id === "string"
          ? row.customer_id
          : null;
    if (!customerId) continue;

    const fromRow =
      typeof row.bankAccountId === "string"
        ? row.bankAccountId
        : typeof row.bank_account_id === "string"
          ? row.bank_account_id
          : null;
    if (fromRow && fromRow.length > 0) {
      return { customerId, bankAccountId: fromRow };
    }

    const fallback = z
      .string()
      .uuid()
      .safeParse(opts?.fallbackBankAccountId?.trim());
    if (fallback.success) {
      return { customerId, bankAccountId: fallback.data };
    }
  }

  return null;
}
