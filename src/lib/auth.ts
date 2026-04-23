import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createSupabaseAnonClient } from "@/lib/supabase";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
    accessToken: string;
  }
}

// NextAuth v5 beta stores custom JWT fields as unknown — we use a helper type for casting
type CustomJWT = {
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Supabase",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim() ?? "";
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;

        const supabase = createSupabaseAnonClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user || !data.session) return null;

        return {
          id: data.user.id,
          name:
            (data.user.user_metadata?.full_name as string | undefined) ??
            data.user.email,
          email: data.user.email,
          image: null,
          // extra fields picked up in the jwt callback via user object
          _accessToken: data.session.access_token,
          _refreshToken: data.session.refresh_token,
          _expiresAt: data.session.expires_at,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as typeof token & CustomJWT;

      // First sign-in: store session data in JWT
      if (user) {
        const u = user as Record<string, unknown>;
        t.userId = user.id ?? "";
        t.accessToken = typeof u._accessToken === "string" ? u._accessToken : undefined;
        t.refreshToken = typeof u._refreshToken === "string" ? u._refreshToken : undefined;
        t.expiresAt = typeof u._expiresAt === "number" ? u._expiresAt : undefined;
        return t;
      }

      // Token still valid (with 60s buffer)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = typeof t.expiresAt === "number" ? t.expiresAt : 0;
      if (expiresAt > 0 && now < expiresAt - 60) return t;

      // Refresh expired token
      const refreshToken = typeof t.refreshToken === "string" ? t.refreshToken : null;
      if (!refreshToken) return t;

      try {
        const supabase = createSupabaseAnonClient();
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (error || !data.session) throw error ?? new Error("No session");

        t.accessToken = data.session.access_token;
        t.refreshToken = data.session.refresh_token ?? undefined;
        t.expiresAt = data.session.expires_at ?? undefined;
      } catch {
        // Keep stale token; user sees auth error on next API call
      }

      return t;
    },

    async session({ session, token }) {
      const t = token as typeof token & CustomJWT;

      if (!t.userId || !t.accessToken || !session.user) {
        throw new Error("Sessao invalida");
      }

      session.user.id = t.userId;
      session.accessToken = t.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
