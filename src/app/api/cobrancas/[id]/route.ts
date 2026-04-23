import { NextResponse } from "next/server";
import { deleteCobranca, updateCobranca } from "@/services/sheets";
import { CobrancaInputSchema } from "@/types/cobranca";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = CobrancaInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const updated = await updateCobranca(
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
    await deleteCobranca(result.ctx.accessToken, result.ctx.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
