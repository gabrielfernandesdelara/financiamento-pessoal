import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findOrCreateSpreadsheet } from "@/services/sheets";

export type AuthedContext = {
  accessToken: string;
  spreadsheetId: string;
};

export async function requireAuthedSheet(): Promise<
  | { ok: true; ctx: AuthedContext }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized" },
        { status: 401 },
      ),
    };
  }
  const spreadsheetId = await findOrCreateSpreadsheet(session.accessToken);
  return {
    ok: true,
    ctx: { accessToken: session.accessToken, spreadsheetId },
  };
}

export function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ error: message }, { status });
}
