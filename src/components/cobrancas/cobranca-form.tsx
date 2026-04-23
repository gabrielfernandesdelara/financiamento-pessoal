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
import { CobrancaInputSchema, type CobrancaInput, type Cobranca } from "@/types/cobranca";
import { todayISO } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Cobranca | null;
  onSubmit: (input: CobrancaInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

const DEFAULTS: CobrancaInput = {
  nomePessoa: "",
  valorDevido: 0,
  nomeCompra: "",
  ehParcelado: false,
  quantidadeParcelas: null,
  valorTotal: 0,
  dataVencimento: todayISO(),
};

export function CobrancaForm({ open, onOpenChange, initial, onSubmit, isSubmitting }: Props) {
  const form = useForm<CobrancaInput>({
    resolver: zodResolver(CobrancaInputSchema),
    defaultValues: DEFAULTS,
  });

  const ehParcelado = useWatch({ control: form.control, name: "ehParcelado" });
  const quantidadeParcelas = useWatch({ control: form.control, name: "quantidadeParcelas" });
  const valorTotal = useWatch({ control: form.control, name: "valorTotal" });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              nomePessoa: initial.nomePessoa,
              valorDevido: initial.valorDevido,
              nomeCompra: initial.nomeCompra,
              ehParcelado: initial.ehParcelado,
              quantidadeParcelas: initial.quantidadeParcelas,
              valorTotal: initial.valorTotal,
              dataVencimento: initial.dataVencimento,
            }
          : DEFAULTS,
      );
    }
  }, [open, initial, form]);

  // Quando parcelado, calcula valor devido automaticamente
  useEffect(() => {
    if (ehParcelado && quantidadeParcelas && valorTotal) {
      const valorPorParcela = Number(valorTotal) / Number(quantidadeParcelas);
      if (valorPorParcela > 0) form.setValue("valorDevido", parseFloat(valorPorParcela.toFixed(2)));
    }
  }, [ehParcelado, quantidadeParcelas, valorTotal, form]);

  const submit = form.handleSubmit(async (values) => {
    const payload: CobrancaInput = {
      ...values,
      quantidadeParcelas: values.ehParcelado ? values.quantidadeParcelas : null,
      valorTotal: values.ehParcelado ? values.valorTotal : values.valorDevido,
    };
    await onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar cobrança" : "Nova cobrança"}</DialogTitle>
          <DialogDescription>
            {initial ? "Atualize os detalhes desta cobrança." : "Registre um valor a cobrar de alguém."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nomePessoa">Nome da pessoa</Label>
            <Input id="nomePessoa" placeholder="João, Maria…" {...form.register("nomePessoa")} />
            {form.formState.errors.nomePessoa && (
              <p className="text-xs text-destructive">{form.formState.errors.nomePessoa.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nomeCompra">Compra / Referência</Label>
            <Input id="nomeCompra" placeholder="Notebook, jantar, viagem…" {...form.register("nomeCompra")} />
            {form.formState.errors.nomeCompra && (
              <p className="text-xs text-destructive">{form.formState.errors.nomeCompra.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dataVencimento">Data de vencimento</Label>
            <Input id="dataVencimento" type="date" {...form.register("dataVencimento")} />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm">
            <Controller
              control={form.control}
              name="ehParcelado"
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <span>É parcelado?</span>
          </label>

          {ehParcelado ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantidadeParcelas">Número de parcelas</Label>
                  <Input
                    id="quantidadeParcelas"
                    type="number"
                    min={1}
                    placeholder="12"
                    {...form.register("quantidadeParcelas", { valueAsNumber: true })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valorTotal">Valor total (R$)</Label>
                  <Input
                    id="valorTotal"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0,00"
                    {...form.register("valorTotal", { valueAsNumber: true })}
                  />
                  {form.formState.errors.valorTotal && (
                    <p className="text-xs text-destructive">{form.formState.errors.valorTotal.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valorDevido">
                  Valor por parcela (R$) — calculado automaticamente
                </Label>
                <Input
                  id="valorDevido"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  readOnly
                  className="bg-muted text-muted-foreground"
                  {...form.register("valorDevido", { valueAsNumber: true })}
                />
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="valorDevido">Valor devido (R$)</Label>
              <Input
                id="valorDevido"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("valorDevido", { valueAsNumber: true })}
              />
              {form.formState.errors.valorDevido && (
                <p className="text-xs text-destructive">{form.formState.errors.valorDevido.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : initial ? "Salvar alterações" : "Adicionar cobrança"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
