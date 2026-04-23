import { NextResponse } from "next/server";
import { deleteCompra, updateCompra, pagarParcela } from "@/services/sheets";
import { CompraInputSchema } from "@/types/compra";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = CompraInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const updated = await updateCompra(result.ctx.accessToken, result.ctx.userId, id, parsed.data);
    return NextResponse.json(updated);
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(_req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    const payResult = await pagarParcela(result.ctx.accessToken, result.ctx.userId, id);
    return NextResponse.json(payResult);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    await deleteCompra(result.ctx.accessToken, result.ctx.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
