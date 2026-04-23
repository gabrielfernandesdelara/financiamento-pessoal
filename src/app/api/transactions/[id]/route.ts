import { NextResponse } from "next/server";
import {
  deleteTransaction,
  updateTransaction,
} from "@/services/sheets";
import { TransactionInputSchema } from "@/types/transaction";
import { jsonError, requireAuthedSheet } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedSheet();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = TransactionInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const updated = await updateTransaction(
      result.ctx.accessToken,
      result.ctx.spreadsheetId,
      id,
      parsed.data,
    );
    return NextResponse.json(updated);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedSheet();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    await deleteTransaction(
      result.ctx.accessToken,
      result.ctx.spreadsheetId,
      id,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
