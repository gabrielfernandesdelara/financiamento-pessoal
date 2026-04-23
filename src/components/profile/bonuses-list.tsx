"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BonusInputSchema, type BonusInput } from "@/types/bonus";
import { useBonuses, useCreateBonus, useDeleteBonus } from "@/hooks/use-bonuses";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function BonusesList() {
  const { data, isLoading } = useBonuses();
  const create = useCreateBonus();
  const remove = useDeleteBonus();

  const form = useForm<BonusInput>({
    resolver: zodResolver(BonusInputSchema),
    defaultValues: { valor: 0, descricao: "", recorrente: false },
  });

  async function handleAdd(input: BonusInput) {
    try {
      await create.mutateAsync(input);
      form.reset({ valor: 0, descricao: "", recorrente: false });
      toast({ title: "Bônus adicionado", variant: "success" });
    } catch (err) {
      toast({
        title: "Erro ao adicionar bônus",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string, descricao: string) {
    if (!confirm(`Remover bônus "${descricao}"?`)) return;
    try {
      await remove.mutateAsync(id);
      toast({ title: "Bônus removido", variant: "success" });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  const bonuses = data ?? [];
  const recorrentes = bonuses.filter((b) => b.recorrente);
  const avulsos = bonuses.filter((b) => !b.recorrente);
  const totalBonus = bonuses.reduce((s, b) => s + b.valor, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Bônus / Renda extra</CardTitle>
        {bonuses.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Total:{" "}
            <span className="font-medium text-foreground">{formatCurrency(totalBonus)}</span>
            {" "}· {bonuses.length} {bonuses.length === 1 ? "registro" : "registros"}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!isLoading && bonuses.length > 0 && (
          <div className="space-y-2">
            {recorrentes.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground">Recorrentes</p>
            )}
            {recorrentes.map((b) => (
              <BonusRow key={b.id} descricao={b.descricao} valor={b.valor} recorrente onDelete={() => handleDelete(b.id, b.descricao)} />
            ))}

            {avulsos.length > 0 && recorrentes.length > 0 && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">Avulsos</p>
            )}
            {avulsos.map((b) => (
              <BonusRow key={b.id} descricao={b.descricao} valor={b.valor} recorrente={false} onDelete={() => handleDelete(b.id, b.descricao)} />
            ))}
          </div>
        )}

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

          <label className="flex items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2.5 text-sm">
            <Controller
              control={form.control}
              name="recorrente"
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>É recorrente? <span className="text-xs text-muted-foreground">(permanece ativo todo mês)</span></span>
          </label>

          <Button type="submit" disabled={create.isPending} size="sm" className="self-start gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {create.isPending ? "Adicionando…" : "Adicionar bônus"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BonusRow({
  descricao,
  valor,
  recorrente,
  onDelete,
}: {
  descricao: string;
  valor: number;
  recorrente: boolean;
  onDelete: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2",
      recorrente && "border-success/30 bg-success/5",
    )}>
      <div className="min-w-0 flex items-center gap-2">
        {recorrente && <RefreshCw className="h-3 w-3 shrink-0 text-success" />}
        <div>
          <p className="truncate text-sm font-medium">{descricao}</p>
          <p className="text-xs text-success">{formatCurrency(valor)}</p>
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        onClick={onDelete}
        aria-label="Remover"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
