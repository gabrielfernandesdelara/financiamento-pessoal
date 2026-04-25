"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile, ProfileInput } from "@/types/profile";
import { formatCurrency } from "@/lib/utils";
import { AtSign } from "lucide-react";

type Props = {
  profile: Profile | null;
  onSubmit: (input: ProfileInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

// ── Salário ───────────────────────────────────────────────────────────────────

const SalarioSchema = z.object({
  salario: z.coerce.number().nonnegative("Salário não pode ser negativo"),
});
type SalarioInput = z.infer<typeof SalarioSchema>;

function SalarioSection({
  profile,
  onSave,
  saving,
}: {
  profile: Profile | null;
  onSave: (v: SalarioInput) => Promise<void>;
  saving: boolean;
}) {
  const form = useForm<SalarioInput>({
    resolver: zodResolver(SalarioSchema),
    defaultValues: { salario: profile?.salario ?? 0 },
  });

  useEffect(() => {
    form.reset({ salario: profile?.salario ?? 0 });
  }, [profile, form]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Salário</CardTitle>
        {profile && (
          <p className="text-xs text-muted-foreground">
            Atual: <span className="font-medium text-foreground">{formatCurrency(profile.salario)}</span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="salario">Valor do salário (R$)</Label>
            <Input
              id="salario"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              {...form.register("salario", { valueAsNumber: true })}
            />
            {form.formState.errors.salario && (
              <p className="text-xs text-destructive">{form.formState.errors.salario.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              O saldo restante será incrementado por este valor no 5º dia útil de cada mês.
            </p>
          </div>
          <Button type="submit" disabled={saving} className="shrink-0">
            {saving ? "Salvando…" : "Salvar salário"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Saldo Restante ────────────────────────────────────────────────────────────

const SaldoSchema = z.object({ saldoRestante: z.coerce.number() });
type SaldoInput = z.infer<typeof SaldoSchema>;

function SaldoSection({
  profile,
  onSave,
  saving,
}: {
  profile: Profile | null;
  onSave: (v: SaldoInput) => Promise<void>;
  saving: boolean;
}) {
  const form = useForm<SaldoInput>({
    resolver: zodResolver(SaldoSchema),
    defaultValues: { saldoRestante: profile?.saldoRestante ?? 0 },
  });

  useEffect(() => {
    form.reset({ saldoRestante: profile?.saldoRestante ?? 0 });
  }, [profile, form]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Saldo Restante</CardTitle>
        {profile && (
          <p className="text-xs text-muted-foreground">
            Atual:{" "}
            <span className="font-medium text-success">{formatCurrency(profile.saldoRestante)}</span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="saldoRestante">Saldo guardado atual (R$)</Label>
            <Input
              id="saldoRestante"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              {...form.register("saldoRestante", { valueAsNumber: true })}
            />
          </div>
          <Button type="submit" disabled={saving} className="shrink-0">
            {saving ? "Salvando…" : "Salvar saldo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Nome de usuário ───────────────────────────────────────────────────────────

const UsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Use apenas letras, números e _"),
});
type UsernameInput = z.infer<typeof UsernameSchema>;

function UsernameSection({
  profile,
  onSave,
  saving,
}: {
  profile: Profile | null;
  onSave: (v: UsernameInput) => Promise<void>;
  saving: boolean;
}) {
  const form = useForm<UsernameInput>({
    resolver: zodResolver(UsernameSchema),
    defaultValues: { username: profile?.username ?? "" },
  });

  useEffect(() => {
    form.reset({ username: profile?.username ?? "" });
  }, [profile, form]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <AtSign className="h-4 w-4" />
          Nome de usuário
        </CardTitle>
        {profile?.username && (
          <p className="text-xs text-muted-foreground">
            Atual: <span className="font-medium text-foreground">@{profile.username}</span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="username">Usuário para login e divisão de compras</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
              <Input
                id="username"
                className="pl-7"
                placeholder="seu_usuario"
                autoComplete="username"
                {...form.register("username")}
              />
            </div>
            {form.formState.errors.username && (
              <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Este nome será usado para fazer login e para outras pessoas dividirem compras com você.
            </p>
          </div>
          <Button type="submit" disabled={saving} className="shrink-0">
            {saving ? "Salvando…" : "Salvar usuário"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ProfileForm({ profile, onSubmit, isSubmitting }: Props) {
  async function saveSalario(v: SalarioInput) {
    await onSubmit({ salario: v.salario, saldoRestante: profile?.saldoRestante ?? 0, username: profile?.username });
  }
  async function saveSaldo(v: SaldoInput) {
    await onSubmit({ salario: profile?.salario ?? 0, saldoRestante: v.saldoRestante, username: profile?.username });
  }
  async function saveUsername(v: UsernameInput) {
    await onSubmit({ salario: profile?.salario ?? 0, saldoRestante: profile?.saldoRestante ?? 0, username: v.username });
  }

  return (
    <div className="space-y-4">
      <UsernameSection profile={profile} onSave={saveUsername} saving={!!isSubmitting} />
      <SalarioSection profile={profile} onSave={saveSalario} saving={!!isSubmitting} />
      <SaldoSection profile={profile} onSave={saveSaldo} saving={!!isSubmitting} />
    </div>
  );
}
