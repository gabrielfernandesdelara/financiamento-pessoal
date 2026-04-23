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

// ── Componente principal ──────────────────────────────────────────────────────

export function ProfileForm({ profile, onSubmit, isSubmitting }: Props) {
  async function saveSalario(v: SalarioInput) {
    await onSubmit({ salario: v.salario, saldoRestante: profile?.saldoRestante ?? 0 });
  }
  async function saveSaldo(v: SaldoInput) {
    await onSubmit({ salario: profile?.salario ?? 0, saldoRestante: v.saldoRestante });
  }

  return (
    <div className="space-y-4">
      <SalarioSection profile={profile} onSave={saveSalario} saving={!!isSubmitting} />
      <SaldoSection profile={profile} onSave={saveSaldo} saving={!!isSubmitting} />
    </div>
  );
}
