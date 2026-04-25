import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createSupabaseAnonClient, createSupabaseServiceClient } from "@/lib/supabase";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
    accessToken: string;
  }
}

type CustomJWT = {
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: {
        // Internally named "email" for NextAuth compatibility;
        // the UI sends either a username string or an email address.
        email: { label: "Usuário ou E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const input = credentials?.email?.toString().trim() ?? "";
        const password = credentials?.password?.toString() ?? "";
        if (!input || !password) return null;

        let email: string;

        if (input.includes("@")) {
          // Direct email login — first-time setup / fallback
          email = input;
        } else {
          // Username login: look up the email via the perfil table
          const sb = createSupabaseServiceClient();
          const { data: profileRow } = await sb
            .from("perfil")
            .select("user_id")
            .ilike("username", input)
            .maybeSingle();

          if (!profileRow?.user_id) return null;

          const { data: userData } = await sb.auth.admin.getUserById(profileRow.user_id);
          if (!userData?.user?.email) return null;
          email = userData.user.email;
        }

        const supabase = createSupabaseAnonClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user || !data.session) return null;

        // Fetch username from perfil to use as the display name
        const sb = createSupabaseServiceClient();
        const { data: perfilRow } = await sb
          .from("perfil")
          .select("username")
          .eq("user_id", data.user.id)
          .maybeSingle();
        const displayName: string =
          perfilRow?.username?.trim() ||
          (data.user.user_metadata?.full_name as string | undefined) ||
          data.user.email ||
          "Usuário";

        return {
          id: data.user.id,
          name: displayName,
          email: data.user.email,
          image: null,
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

      if (user) {
        const u = user as Record<string, unknown>;
        t.userId = user.id ?? "";
        t.accessToken = typeof u._accessToken === "string" ? u._accessToken : undefined;
        t.refreshToken = typeof u._refreshToken === "string" ? u._refreshToken : undefined;
        t.expiresAt = typeof u._expiresAt === "number" ? u._expiresAt : undefined;
        return t;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = typeof t.expiresAt === "number" ? t.expiresAt : 0;
      if (expiresAt > 0 && now < expiresAt - 60) return t;

      const refreshToken = typeof t.refreshToken === "string" ? t.refreshToken : null;
      if (!refreshToken) return t;

      try {
        const supabase = createSupabaseAnonClient();
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        if (error || !data.session) throw error ?? new Error("No session");
        t.accessToken = data.session.access_token;
        t.refreshToken = data.session.refresh_token ?? undefined;
        t.expiresAt = data.session.expires_at ?? undefined;
      } catch {
        // Keep stale token; user will see auth error on next API call
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
