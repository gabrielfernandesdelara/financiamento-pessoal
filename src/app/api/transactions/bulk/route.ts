import { NextResponse } from "next/server";
import { z } from "zod";
import { appendTransactionsBulk } from "@/services/sheets";
import { TransactionInputSchema } from "@/types/transaction";
import { jsonError, requireAuthedSheet } from "@/lib/api-helpers";

const BulkBodySchema = z.object({
  transactions: z
    .array(TransactionInputSchema.extend({ id: z.string().optional() }))
    .min(1)
    .max(2000),
});

export async function POST(req: Request) {
  try {
    const result = await requireAuthedSheet();
    if (!result.ok) return result.response;

    const body = await req.json();
    const parsed = BulkBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { inserted, skipped } = await appendTransactionsBulk(
      result.ctx.accessToken,
      result.ctx.spreadsheetId,
      parsed.data.transactions,
    );

    return NextResponse.json(
      { inserted: inserted.length, skipped, transactions: inserted },
      { status: 201 },
    );
  } catch (err) {
    return jsonError(err);
  }
}
