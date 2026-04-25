"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      email: identifier,   // field is named "email" internally for NextAuth
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Usuário ou senha inválidos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

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
          Entre com seu nome de usuário e senha.
        </p>

        <form className="mt-6 space-y-4 text-left" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="identifier">Nome de usuário</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="seu_usuario"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
            {isLoading ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Ainda não tem usuário? Acesse com seu e-mail para configurar um nome de usuário na aba Perfil.
        </p>
      </Card>
    </div>
  );
}
