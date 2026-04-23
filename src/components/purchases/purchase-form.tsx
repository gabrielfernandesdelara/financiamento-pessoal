"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CompraInputSchema, type CompraInput, type Compra } from "@/types/compra";
import { todayISO } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Compra | null;
  onSubmit: (input: CompraInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

const DEFAULTS: CompraInput = {
  nome: "",
  cartaoOuPessoa: "",
  parcelada: false,
  totalParcelas: null,
  parcelasRestantes: null,
  dataInicio: todayISO(),
  valorParcela: 0,
  valorTotal: 0,
};

export function PurchaseForm({ open, onOpenChange, initial, onSubmit, isSubmitting }: Props) {
  const form = useForm<CompraInput>({
    resolver: zodResolver(CompraInputSchema),
    defaultValues: DEFAULTS,
  });

  const parcelada = useWatch({ control: form.control, name: "parcelada" });
  const totalParcelas = useWatch({ control: form.control, name: "totalParcelas" });
  const valorParcela = useWatch({ control: form.control, name: "valorParcela" });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              nome: initial.nome,
              cartaoOuPessoa: initial.cartaoOuPessoa,
              parcelada: initial.parcelada,
              totalParcelas: initial.totalParcelas,
              parcelasRestantes: initial.parcelasRestantes,
              dataInicio: initial.dataInicio,
              valorParcela: initial.valorParcela,
              valorTotal: initial.valorTotal,
            }
          : DEFAULTS,
      );
    }
  }, [open, initial, form]);

  useEffect(() => {
    if (parcelada && totalParcelas && valorParcela) {
      const total = Number(totalParcelas) * Number(valorParcela);
      if (total > 0) form.setValue("valorTotal", total);
    }
  }, [parcelada, totalParcelas, valorParcela, form]);

  const submit = form.handleSubmit(async (values) => {
    const n = (v: unknown) => Number(v) || 0;
    const valorTotalCalc = values.parcelada
      ? n(values.totalParcelas) * n(values.valorParcela)
      : n(values.valorTotal);

    const payload: CompraInput = {
      ...values,
      valorTotal: valorTotalCalc > 0 ? valorTotalCalc : n(values.valorTotal),
      totalParcelas: values.parcelada ? values.totalParcelas : null,
      parcelasRestantes: values.parcelada ? (values.parcelasRestantes ?? values.totalParcelas) : null,
      valorParcela: values.parcelada ? n(values.valorParcela) : n(values.valorTotal),
    };
    await onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar compra" : "Nova compra"}</DialogTitle>
          <DialogDescription>
            {initial ? "Atualize os detalhes desta compra." : "Registre uma nova compra no seu controle financeiro."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome da compra</Label>
            <Input id="nome" placeholder="Notebook, geladeira, curso…" {...form.register("nome")} />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cartaoOuPessoa">Cartão / Pessoa responsável</Label>
            <Input id="cartaoOuPessoa" placeholder="Nubank, Itaú, João…" {...form.register("cartaoOuPessoa")} />
            {form.formState.errors.cartaoOuPessoa && (
              <p className="text-xs text-destructive">{form.formState.errors.cartaoOuPessoa.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dataInicio">Data de início do pagamento</Label>
            <Input id="dataInicio" type="date" {...form.register("dataInicio")} />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm">
            <Controller
              control={form.control}
              name="parcelada"
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>É parcelada?</span>
          </label>

          {parcelada ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="totalParcelas">Total de parcelas</Label>
                <Input
                  id="totalParcelas"
                  type="number"
                  min={1}
                  placeholder="12"
                  {...form.register("totalParcelas", { valueAsNumber: true })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valorParcela">Valor por parcela (R$)</Label>
                <Input
                  id="valorParcela"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...form.register("valorParcela", { valueAsNumber: true })}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="valorTotal">
              {parcelada ? "Valor total (calculado automaticamente)" : "Valor total (R$)"}
            </Label>
            <Input
              id="valorTotal"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              readOnly={parcelada}
              className={parcelada ? "bg-muted text-muted-foreground" : ""}
              {...form.register("valorTotal", { valueAsNumber: true })}
            />
            {form.formState.errors.valorTotal && (
              <p className="text-xs text-destructive">{form.formState.errors.valorTotal.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : initial ? "Salvar alterações" : "Adicionar compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
