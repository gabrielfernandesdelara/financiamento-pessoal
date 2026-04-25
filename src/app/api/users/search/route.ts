import { NextResponse } from "next/server";
import { findUserByUsername } from "@/services/sheets";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json({ error: "username obrigatório" }, { status: 400 });
    }

    const userId = await findUserByUsername(username);

    if (!userId) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    if (userId === result.ctx.userId) {
      return NextResponse.json({ error: "Não é possível dividir consigo mesmo" }, { status: 400 });
    }

    return NextResponse.json({ found: true, userId });
  } catch (err) {
    return jsonError(err);
  }
}
