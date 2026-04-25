"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PrevisaoInputSchema, type PrevisaoInput, type Previsao } from "@/types/previsao";
import { todayISO, formatCurrency } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Previsao | null;
  onSubmit: (input: PrevisaoInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

const DEFAULTS: PrevisaoInput = {
  descricao: "",
  valor: 0,
  dataPrevista: todayISO(),
  parcelada: false,
  totalParcelas: null,
  valorParcela: 0,
  categoria: "Previsão",
  recorrente: false,
};

export function PrevisaoForm({ open, onOpenChange, initial, onSubmit, isSubmitting }: Props) {
  const form = useForm<PrevisaoInput>({
    resolver: zodResolver(PrevisaoInputSchema),
    defaultValues: DEFAULTS,
  });

  const parcelada     = useWatch({ control: form.control, name: "parcelada" });
  const recorrente    = useWatch({ control: form.control, name: "recorrente" });
  const totalParcelas = useWatch({ control: form.control, name: "totalParcelas" });
  const valorParcela  = useWatch({ control: form.control, name: "valorParcela" });
  const valorTotal    = useWatch({ control: form.control, name: "valor" });

  const [dividir, setDividir] = useState(false);
  const [numeroPessoas, setNumeroPessoas] = useState(2);

  useEffect(() => {
    if (open) {
      form.reset(initial ? {
        descricao: initial.descricao,
        valor: initial.valor,
        dataPrevista: initial.dataPrevista,
        parcelada: initial.parcelada,
        totalParcelas: initial.totalParcelas,
        valorParcela: initial.valorParcela,
        categoria: initial.categoria,
        recorrente: initial.recorrente ?? false,
      } : DEFAULTS);
      setDividir(false);
      setNumeroPessoas(2);
    }
  }, [open, initial, form]);

  // Disable parcelada when recorrente is on
  useEffect(() => {
    if (recorrente) {
      form.setValue("parcelada", false);
      form.setValue("totalParcelas", null);
    }
  }, [recorrente, form]);

  // Auto-calc total when parcelada
  useEffect(() => {
    if (parcelada && totalParcelas && valorParcela) {
      const total = Number(totalParcelas) * Number(valorParcela);
      if (total > 0) form.setValue("valor", total);
    }
  }, [parcelada, totalParcelas, valorParcela, form]);

  const valorBruto = Number(valorTotal) || 0;
  const valorPorPessoa = dividir && numeroPessoas > 1 ? valorBruto / numeroPessoas : null;

  const submit = form.handleSubmit(async (values) => {
    const n = (v: unknown) => Number(v) || 0;
    let valorFinal = values.parcelada
      ? n(values.totalParcelas) * n(values.valorParcela) || n(values.valor)
      : n(values.valor);

    // Divide cost by number of people (store only the user's share)
    if (dividir && numeroPessoas > 1) {
      valorFinal = valorFinal / numeroPessoas;
    }

    const payload: PrevisaoInput = {
      ...values,
      valor: valorFinal,
      valorParcela: values.parcelada
        ? (dividir && numeroPessoas > 1 ? n(values.valorParcela) / numeroPessoas : n(values.valorParcela))
        : 0,
      totalParcelas: values.parcelada ? values.totalParcelas : null,
      recorrente: values.recorrente ?? false,
    };
    await onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar previsão" : "Nova previsão"}</DialogTitle>
          <DialogDescription>
            {initial ? "Atualize os detalhes desta previsão." : "Lance um compromisso financeiro futuro."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          {/* Descrição */}
          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" placeholder="Aluguel, conta de luz, viagem…" {...form.register("descricao")} />
            {form.formState.errors.descricao && (
              <p className="text-xs text-destructive">{form.formState.errors.descricao.message}</p>
            )}
          </div>

          {/* Data */}
          <div className="grid gap-2">
            <Label htmlFor="dataPrevista">Data prevista</Label>
            <Input id="dataPrevista" type="date" {...form.register("dataPrevista")} />
          </div>

          {/* Recorrente */}
          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm cursor-pointer">
            <Controller control={form.control} name="recorrente" render={({ field }) => (
              <input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={!!field.value} onChange={field.onChange} />
            )} />
            <div>
              <span className="font-medium">É recorrente?</span>
              <p className="text-xs text-muted-foreground">Repete todo mês a partir da data prevista</p>
            </div>
          </label>

          {/* Parcelada — oculto se recorrente */}
          {!recorrente && (
            <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm cursor-pointer">
              <Controller control={form.control} name="parcelada" render={({ field }) => (
                <input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={field.value} onChange={field.onChange} />
              )} />
              <span>É parcelada?</span>
            </label>
          )}

          {parcelada && !recorrente && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prevTotalParcelas">Número de parcelas</Label>
                <Input id="prevTotalParcelas" type="number" min={1} placeholder="12"
                  {...form.register("totalParcelas", { valueAsNumber: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prevValorParcela">Valor por parcela (R$)</Label>
                <Input id="prevValorParcela" type="number" step="0.01" inputMode="decimal" placeholder="0,00"
                  {...form.register("valorParcela", { valueAsNumber: true })} />
              </div>
            </div>
          )}

          {/* Valor */}
          <div className="grid gap-2">
            <Label htmlFor="prevValor">
              {parcelada && !recorrente ? "Valor total (calculado)" : "Valor (R$)"}
            </Label>
            <Input
              id="prevValor"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              readOnly={parcelada && !recorrente}
              className={parcelada && !recorrente ? "bg-muted text-muted-foreground" : ""}
              {...form.register("valor", { valueAsNumber: true })}
            />
            {form.formState.errors.valor && (
              <p className="text-xs text-destructive">{form.formState.errors.valor.message}</p>
            )}
          </div>

          {/* Dividir custo */}
          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary"
              checked={dividir}
              onChange={(e) => {
                setDividir(e.target.checked);
                if (!e.target.checked) setNumeroPessoas(2);
              }}
            />
            <div>
              <span className="font-medium">Dividir o custo com outras pessoas?</span>
              <p className="text-xs text-muted-foreground">Divide o valor igualmente — salva apenas a sua parte</p>
            </div>
          </label>

          {dividir && (
            <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Label htmlFor="numeroPessoas" className="flex-1">Total de pessoas (incluindo você)</Label>
                <Input
                  id="numeroPessoas"
                  type="number"
                  min={2}
                  max={20}
                  className="w-20 text-center"
                  value={numeroPessoas}
                  onChange={(e) => setNumeroPessoas(Math.max(2, Number(e.target.value) || 2))}
                />
              </div>
              {valorPorPessoa !== null && valorBruto > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sua parte: <strong className="text-foreground">{formatCurrency(valorPorPessoa)}</strong>
                  {" "}({numeroPessoas} pessoas · {formatCurrency(valorBruto)} total)
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : initial ? "Salvar alterações" : "Adicionar previsão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
