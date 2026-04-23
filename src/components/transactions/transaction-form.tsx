"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TransactionInputSchema,
  type TransactionInput,
  type Transaction,
} from "@/types/transaction";
import { todayISO } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Transaction | null;
  categories: string[];
  onSubmit: (input: TransactionInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

const DEFAULTS: TransactionInput = {
  description: "",
  amount: 0,
  type: "expense",
  category: "",
  date: todayISO(),
  recurring: false,
};

export function TransactionForm({
  open,
  onOpenChange,
  initial,
  categories,
  onSubmit,
  isSubmitting,
}: Props) {
  const form = useForm<TransactionInput>({
    resolver: zodResolver(TransactionInputSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              description: initial.description,
              amount: initial.amount,
              type: initial.type,
              category: initial.category,
              date: initial.date,
              recurring: initial.recurring,
            }
          : DEFAULTS,
      );
    }
  }, [open, initial, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar transação" : "Nova transação"}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? "Atualize os detalhes desta transação."
              : "Adicione um novo lançamento ao seu controle financeiro."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Café, salário, aluguel…"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                list="categories"
                placeholder="Mercado, salário…"
                {...form.register("category")}
              />
              <datalist id="categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-[hsl(217_89%_53%)]"
              {...form.register("recurring")}
            />
            <span>Esta é uma transação recorrente</span>
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Salvando…"
                : initial
                  ? "Salvar alterações"
                  : "Adicionar transação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
