import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type AuthedContext = {
  userId: string;
  accessToken: string;
  userName: string;
};

export async function requireAuthedUser(): Promise<
  | { ok: true; ctx: AuthedContext }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return {
    ok: true,
    ctx: {
      userId: session.user.id,
      accessToken: session.accessToken,
      userName: session.user.name ?? session.user.email ?? "Usuário",
    },
  };
}

export function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ error: message }, { status });
}
