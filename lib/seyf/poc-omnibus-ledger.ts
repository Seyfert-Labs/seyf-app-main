import { randomUUID } from "node:crypto";

/**
 * PoC: una sola wallet Etherfuse (`ETHERFUSE_MVP_*` / cookie identidad) en la red;
 * los saldos “por usuario” viven solo aquí (memoria). Se pierde al reiniciar el servidor.
 * Producción: Postgres + custodia real; esto no mezcla fondos legales, solo demuestra UX.
 */

export type PocLedgerEntry = {
  id: string;
  ts: string;
  type: "credit" | "debit";
  amountMxn: number;
  memo: string;
};

type PocUserBook = {
  balanceMxn: number;
  entries: PocLedgerEntry[];
};

function store(): Map<string, PocUserBook> {
  const g = globalThis as unknown as {
    __seyfPocOmnibusStore?: Map<string, PocUserBook>;
  };
  if (!g.__seyfPocOmnibusStore) {
    g.__seyfPocOmnibusStore = new Map();
  }
  return g.__seyfPocOmnibusStore;
}

function book(userId: string): PocUserBook {
  const m = store();
  let b = m.get(userId);
  if (!b) {
    b = { balanceMxn: 0, entries: [] };
    m.set(userId, b);
  }
  return b;
}

export function getPocLedgerSnapshot(userId: string): {
  balanceMxn: number;
  entries: PocLedgerEntry[];
} {
  const b = book(userId);
  return {
    balanceMxn: b.balanceMxn,
    entries: [...b.entries].reverse(),
  };
}

export function pocLedgerCredit(
  userId: string,
  amountMxn: number,
  memo: string,
): PocLedgerEntry {
  if (!Number.isFinite(amountMxn) || amountMxn <= 0) {
    throw new Error("Monto inválido");
  }
  const b = book(userId);
  const entry: PocLedgerEntry = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    type: "credit",
    amountMxn,
    memo,
  };
  b.balanceMxn += amountMxn;
  b.entries.push(entry);
  return entry;
}

export function pocLedgerDebit(
  userId: string,
  amountMxn: number,
  memo: string,
): PocLedgerEntry {
  if (!Number.isFinite(amountMxn) || amountMxn <= 0) {
    throw new Error("Monto inválido");
  }
  const b = book(userId);
  if (b.balanceMxn + 1e-9 < amountMxn) {
    throw new Error("Saldo insuficiente");
  }
  const entry: PocLedgerEntry = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    type: "debit",
    amountMxn,
    memo,
  };
  b.balanceMxn -= amountMxn;
  b.entries.push(entry);
  return entry;
}
