"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-12 animate-pulse rounded-2xl bg-muted/70" />
    );
  }

  if (!session?.user) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push("/login")}
      >
        <LogIn className="h-4 w-4" />
        Entrar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
      {session.user.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt={session.user.name ?? ""}
          className="h-9 w-9 rounded-full"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {session.user.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {session.user.email}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => signOut()}
        aria-label="Sair"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
