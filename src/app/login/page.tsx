"use client";

import { signIn } from "next-auth/react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-md p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <Wallet className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Bem-vindo ao Finanças
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Um painel simples para o seu dinheiro. Seus dados ficam em uma
          planilha do Google no seu próprio Drive.
        </p>
        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          Continuar com Google
        </Button>
      </Card>
    </div>
  );
}
