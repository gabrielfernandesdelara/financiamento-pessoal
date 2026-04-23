import { NextResponse } from "next/server";
import { appendCobranca, listCobrancas } from "@/services/sheets";
import { CobrancaInputSchema } from "@/types/cobranca";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const cobrancas = await listCobrancas(
      result.ctx.accessToken,
      result.ctx.userId,
    );
    return NextResponse.json(cobrancas);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const body = await req.json();
    const parsed = CobrancaInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const created = await appendCobranca(
      result.ctx.accessToken,
      result.ctx.userId,
      parsed.data,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
