import { NextResponse } from "next/server";
import { appendPrevisao, listPrevisoes } from "@/services/sheets";
import { PrevisaoInputSchema } from "@/types/previsao";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const previsoes = await listPrevisoes(result.ctx.accessToken, result.ctx.userId);
    return NextResponse.json(previsoes);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const body = await req.json();
    const parsed = PrevisaoInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid", issues: parsed.error.flatten() }, { status: 400 });
    }
    const created = await appendPrevisao(result.ctx.accessToken, result.ctx.userId, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
