"use client";

import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SignInRequired() {
  const router = useRouter();

  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <LogIn className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-semibold">Entre para continuar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Seus dados ficam protegidos no Supabase e vinculados a sua conta.
      </p>
      <Button className="mt-6 w-full" onClick={() => router.push("/login")}>
        Ir para login
      </Button>
    </Card>
  );
}
