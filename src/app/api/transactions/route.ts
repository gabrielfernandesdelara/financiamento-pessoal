import { NextResponse } from "next/server";
import {
  appendTransaction,
  listTransactions,
  deleteAllTransactions,
} from "@/services/sheets";
import { TransactionInputSchema } from "@/types/transaction";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const transactions = await listTransactions(
      result.ctx.accessToken,
      result.ctx.userId,
    );
    return NextResponse.json(transactions);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const body = await req.json();
    const parsed = TransactionInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const created = await appendTransaction(
      result.ctx.accessToken,
      result.ctx.userId,
      parsed.data,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    await deleteAllTransactions(result.ctx.accessToken, result.ctx.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
