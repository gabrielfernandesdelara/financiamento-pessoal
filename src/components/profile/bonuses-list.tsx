"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BonusInputSchema, type BonusInput } from "@/types/bonus";
import { useBonuses, useCreateBonus, useDeleteBonus } from "@/hooks/use-bonuses";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function BonusesList() {
  const { data, isLoading } = useBonuses();
  const create = useCreateBonus();
  const remove = useDeleteBonus();

  const form = useForm<BonusInput>({
    resolver: zodResolver(BonusInputSchema),
    defaultValues: { valor: 0, descricao: "" },
  });

  async function handleAdd(input: BonusInput) {
    try {
      await create.mutateAsync(input);
      form.reset({ valor: 0, descricao: "" });
      toast({ title: "Bônus adicionado", variant: "success" });
    } catch (err) {
      toast({ title: "Erro ao adicionar bônus", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  async function handleDelete(id: string, descricao: string) {
    if (!confirm(`Remover bônus "${descricao}"?`)) return;
    try {
      await remove.mutateAsync(id);
      toast({ title: "Bônus removido", variant: "success" });
    } catch (err) {
      toast({ title: "Erro ao remover", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  const bonuses = data ?? [];
  const totalBonus = bonuses.reduce((s, b) => s + b.valor, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Bônus / Renda extra</CardTitle>
        {bonuses.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{formatCurrency(totalBonus)}</span>
            {" "}· {bonuses.length} {bonuses.length === 1 ? "bônus" : "bônus"}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista existente */}
        {!isLoading && bonuses.length > 0 && (
          <div className="space-y-2">
            {bonuses.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.descricao}</p>
                  <p className="text-xs text-success">{formatCurrency(b.valor)}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(b.id, b.descricao)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário de adição */}
        <form onSubmit={form.handleSubmit(handleAdd)} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bonus-descricao" className="text-xs">Origem</Label>
              <Input
                id="bonus-descricao"
                placeholder="Freelance, 13º salário…"
                className="h-9 text-sm"
                {...form.register("descricao")}
              />
              {form.formState.errors.descricao && (
                <p className="text-xs text-destructive">{form.formState.errors.descricao.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bonus-valor" className="text-xs">Valor (R$)</Label>
              <Input
                id="bonus-valor"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                className="h-9 text-sm"
                {...form.register("valor", { valueAsNumber: true })}
              />
              {form.formState.errors.valor && (
                <p className="text-xs text-destructive">{form.formState.errors.valor.message}</p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={create.isPending} size="sm" className="self-start gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {create.isPending ? "Adicionando…" : "Adicionar bônus"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
