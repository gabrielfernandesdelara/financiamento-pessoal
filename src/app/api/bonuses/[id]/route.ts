import { NextResponse } from "next/server";
import { deleteBonus } from "@/services/sheets";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const { id } = await ctx.params;
    await deleteBonus(result.ctx.accessToken, result.ctx.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
