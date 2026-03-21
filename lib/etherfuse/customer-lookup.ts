import { randomUUID } from "node:crypto";
import { etherfuseFetch, etherfuseReadBody } from "./client";
import { normalizeStellarPublicKey } from "./stellar-public-key";

const PAGE_SIZE = 100;
const MAX_CUSTOMER_PAGES = 20;

type CustomersList = { items?: { customerId?: string }[] };
type WalletsList = { items?: { publicKey?: string }[] };
type BankAccountsList = { items?: { bankAccountId?: string }[] };

function sameWalletKey(a: string, b: string): boolean {
  return normalizeStellarPublicKey(a) === normalizeStellarPublicKey(b);
}

/**
 * Cuando onboarding-url devuelve 409 (wallet ya registrada), hay que reutilizar el customerId
 * real de Etherfuse, no UUIDs nuevos. Recorre clientes y wallets de la org de la API key.
 *
 * @see flujo similar en la guía interactiva de https://docs.etherfuse.com/guides/onboarding
 */
export async function findRampContextByWalletPublicKey(
  publicKey: string,
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
        typeof first === "string" && first.length > 0 ? first : randomUUID();

      return { customerId, bankAccountId };
    }

    if (customers.length < PAGE_SIZE) break;
  }

  return null;
}
