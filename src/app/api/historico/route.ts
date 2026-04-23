import { NextResponse } from "next/server";
import { listAllComprasAndCobrancasAndBonuses } from "@/services/sheets";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const data = await listAllComprasAndCobrancasAndBonuses(
      result.ctx.accessToken,
      result.ctx.userId,
    );
    return NextResponse.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
