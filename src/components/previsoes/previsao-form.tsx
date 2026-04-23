"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PrevisaoInputSchema, type PrevisaoInput, type Previsao } from "@/types/previsao";
import { CATEGORIAS_SUGERIDAS } from "@/types/compra";
import { todayISO } from "@/lib/utils";

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
};

const CATS = ["Previsão", ...CATEGORIAS_SUGERIDAS.filter(c => c !== "Outros"), "Outros"];

export function PrevisaoForm({ open, onOpenChange, initial, onSubmit, isSubmitting }: Props) {
  const form = useForm<PrevisaoInput>({
    resolver: zodResolver(PrevisaoInputSchema),
    defaultValues: DEFAULTS,
  });

  const parcelada = useWatch({ control: form.control, name: "parcelada" });
  const totalParcelas = useWatch({ control: form.control, name: "totalParcelas" });
  const valorParcela = useWatch({ control: form.control, name: "valorParcela" });

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
      } : DEFAULTS);
    }
  }, [open, initial, form]);

  useEffect(() => {
    if (parcelada && totalParcelas && valorParcela) {
      const total = Number(totalParcelas) * Number(valorParcela);
      if (total > 0) form.setValue("valor", total);
    }
  }, [parcelada, totalParcelas, valorParcela, form]);

  const submit = form.handleSubmit(async (values) => {
    const n = (v: unknown) => Number(v) || 0;
    const payload: PrevisaoInput = {
      ...values,
      valor: values.parcelada ? n(values.totalParcelas) * n(values.valorParcela) || n(values.valor) : n(values.valor),
      totalParcelas: values.parcelada ? values.totalParcelas : null,
      valorParcela: values.parcelada ? n(values.valorParcela) : 0,
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
          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" placeholder="Aluguel, conta de luz, salário…" {...form.register("descricao")} />
            {form.formState.errors.descricao && (
              <p className="text-xs text-destructive">{form.formState.errors.descricao.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dataPrevista">Data prevista</Label>
              <Input id="dataPrevista" type="date" {...form.register("dataPrevista")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prev-categoria">Categoria</Label>
              <Input
                id="prev-categoria"
                list="cats-prev"
                placeholder="Previsão, Aluguel…"
                {...form.register("categoria")}
              />
              <datalist id="cats-prev">
                {CATS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm">
            <Controller
              control={form.control}
              name="parcelada"
              render={({ field }) => (
                <input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={field.value} onChange={field.onChange} />
              )}
            />
            <span>É parcelada?</span>
          </label>

          {parcelada ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prevTotalParcelas">Número de parcelas</Label>
                <Input id="prevTotalParcelas" type="number" min={1} placeholder="12" {...form.register("totalParcelas", { valueAsNumber: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prevValorParcela">Valor por parcela (R$)</Label>
                <Input id="prevValorParcela" type="number" step="0.01" inputMode="decimal" placeholder="0,00" {...form.register("valorParcela", { valueAsNumber: true })} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="prevValor">
              {parcelada ? "Valor total (calculado automaticamente)" : "Valor (R$)"}
            </Label>
            <Input
              id="prevValor"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              readOnly={parcelada}
              className={parcelada ? "bg-muted text-muted-foreground" : ""}
              {...form.register("valor", { valueAsNumber: true })}
            />
            {form.formState.errors.valor && (
              <p className="text-xs text-destructive">{form.formState.errors.valor.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : initial ? "Salvar alterações" : "Adicionar previsão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
