import { NextResponse } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/seyf/api-error";
import { isEtherfuseDevPanelEnabled } from "@/lib/seyf/etherfuse-dev-panel";
import {
  getPocLedgerSnapshot,
  pocLedgerCredit,
  pocLedgerDebit,
} from "@/lib/seyf/poc-omnibus-ledger";
import { POC_USER_COOKIE, getOrCreatePocUserId } from "@/lib/seyf/poc-user-cookie";

function guardPoc(): NextResponse | null {
  if (!isEtherfuseDevPanelEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

function cookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

/**
 * GET /api/seyf/poc/ledger — saldo y movimientos del usuario PoC (cookie anónima).
 */
export async function GET() {
  const denied = guardPoc();
  if (denied) return denied;

  const { userId, isNew } = await getOrCreatePocUserId();
  const snap = getPocLedgerSnapshot(userId);
  const res = NextResponse.json({
    userId,
    model: "omnibus_poc" as const,
    note:
      "Una sola wallet Etherfuse en sandbox; saldos por usuario solo en memoria (PoC).",
    ...snap,
  });
  if (isNew) {
    res.cookies.set(POC_USER_COOKIE, userId, cookieOptions());
  }
  return res;
}

const postSchema = z.object({
  action: z.enum(["credit", "debit"]),
  amountMxn: z.number().positive(),
  memo: z.string().max(200).optional(),
});

/**
 * POST /api/seyf/poc/ledger — simular abono o retiro en el libro interno (solo dev).
 */
export async function POST(req: Request) {
  const denied = guardPoc();
  if (denied) return denied;

  const { userId, isNew } = await getOrCreatePocUserId();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const memo =
    parsed.data.memo?.trim() ||
    (parsed.data.action === "credit"
      ? "Abono simulado (PoC)"
      : "Retiro simulado (PoC)");

  try {
    const entry =
      parsed.data.action === "credit"
        ? pocLedgerCredit(userId, parsed.data.amountMxn, memo)
        : pocLedgerDebit(userId, parsed.data.amountMxn, memo);
    const snap = getPocLedgerSnapshot(userId);
    const res = NextResponse.json({ entry, ...snap, userId });
    if (isNew) {
      res.cookies.set(POC_USER_COOKIE, userId, cookieOptions());
    }
    return res;
  } catch (e) {
    return toErrorResponse(e, "poc/ledger");
  }
}
