import { NextResponse } from "next/server";
import { getHistorico } from "@/services/sheets";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const items = await getHistorico(result.ctx.accessToken, result.ctx.userId);
    return NextResponse.json(items);
  } catch (err) {
    console.error("[api/historico] error:", err);
    return jsonError(err);
  }
}
