import { NextResponse } from "next/server";
import { pagarTudo } from "@/services/sheets";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const body = await req.json().catch(() => ({})) as { filtro?: string };
    const resultado = await pagarTudo(
      result.ctx.accessToken,
      result.ctx.userId,
      body.filtro,
    );
    return NextResponse.json(resultado);
  } catch (err) {
    return jsonError(err);
  }
}
