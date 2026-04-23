import { NextResponse } from "next/server";
import { deletePurchase, updatePurchase } from "@/services/sheets";
import { PurchaseInputSchema } from "@/types/purchase";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = PurchaseInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const updated = await updatePurchase(
      result.ctx.accessToken,
      result.ctx.userId,
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
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    await deletePurchase(result.ctx.accessToken, result.ctx.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
