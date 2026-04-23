"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SignInRequired() {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <LogIn className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-semibold">Entre para continuar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Usamos sua conta Google para armazenar suas transações com segurança
        em uma planilha no seu Drive.
      </p>
      <Button className="mt-6 w-full" onClick={() => signIn("google")}>
        Entrar com Google
      </Button>
    </Card>
  );
}
