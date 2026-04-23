import { NextResponse } from "next/server";
import {
  appendTransaction,
  listTransactions,
} from "@/services/sheets";
import { TransactionInputSchema } from "@/types/transaction";
import { jsonError, requireAuthedSheet } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedSheet();
    if (!result.ok) return result.response;
    const transactions = await listTransactions(
      result.ctx.accessToken,
      result.ctx.spreadsheetId,
    );
    return NextResponse.json(transactions);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const result = await requireAuthedSheet();
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
      result.ctx.spreadsheetId,
      parsed.data,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
