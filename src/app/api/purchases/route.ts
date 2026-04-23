import { NextResponse } from "next/server";
import { appendPurchase, listPurchases } from "@/services/sheets";
import { PurchaseInputSchema } from "@/types/purchase";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const purchases = await listPurchases(
      result.ctx.accessToken,
      result.ctx.userId,
    );
    return NextResponse.json(purchases);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const body = await req.json();
    const parsed = PurchaseInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const created = await appendPurchase(
      result.ctx.accessToken,
      result.ctx.userId,
      parsed.data,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
