import { NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/services/sheets";
import { ProfileInputSchema } from "@/types/profile";
import { jsonError, requireAuthedUser } from "@/lib/api-helpers";

export async function GET() {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const profile = await getProfile(result.ctx.accessToken, result.ctx.userId);
    return NextResponse.json(profile);
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const result = await requireAuthedUser();
    if (!result.ok) return result.response;
    const body = await req.json();
    const parsed = ProfileInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const profile = await upsertProfile(
      result.ctx.accessToken,
      result.ctx.userId,
      parsed.data,
    );
    return NextResponse.json(profile);
  } catch (err) {
    return jsonError(err);
  }
}
