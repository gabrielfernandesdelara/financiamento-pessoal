import { NextResponse } from "next/server";
import { appendCompra, listCompras } from "@/services/sheets";
import { CompraInputSchema } from "@/types/compra";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const compras = await listCompras(result.ctx.accessToken, result.ctx.userId);
    return NextResponse.json(compras);
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const body = await req.json();
    const parsed = CompraInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const created = await appendCompra(
      result.ctx.accessToken,
      result.ctx.userId,
      parsed.data,
      result.ctx.userName,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
