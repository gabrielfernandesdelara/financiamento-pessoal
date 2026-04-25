"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, CheckCircle2, XCircle, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CompraInputSchema, type CompraInput, type Compra, type Participante, CATEGORIAS_SUGERIDAS } from "@/types/compra";
import { todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Compra | null;
  onSubmit: (input: CompraInput) => Promise<void> | void;
  isSubmitting?: boolean;
};

type ParticipanteEntry =
  | { tipo: "cadastrado"; username: string; status: "idle" | "loading" | "found" | "not_found" }
  | { tipo: "sem_cadastro"; nome: string; contato: string };

const DEFAULTS: CompraInput = {
  nome: "",
  cartaoOuPessoa: "",
  parcelada: false,
  totalParcelas: null,
  parcelasRestantes: null,
  dataInicio: todayISO(),
  valorParcela: 0,
  valorTotal: 0,
  categoria: "Outros",
  semDataTermino: false,
  participantes: [],
};

export function PurchaseForm({ open, onOpenChange, initial, onSubmit, isSubmitting }: Props) {
  const form = useForm<CompraInput>({
    resolver: zodResolver(CompraInputSchema),
    defaultValues: DEFAULTS,
  });

  const parcelada     = useWatch({ control: form.control, name: "parcelada" });
  const totalParcelas = useWatch({ control: form.control, name: "totalParcelas" });
  const valorParcela  = useWatch({ control: form.control, name: "valorParcela" });
  const semDataTermino = useWatch({ control: form.control, name: "semDataTermino" });

  const [dividir, setDividir] = useState(false);
  const [participantes, setParticipantes] = useState<ParticipanteEntry[]>([]);

  useEffect(() => {
    if (open) {
      form.reset(
        initial ? {
          nome: initial.nome,
          cartaoOuPessoa: initial.cartaoOuPessoa,
          parcelada: initial.parcelada,
          totalParcelas: initial.totalParcelas,
          parcelasRestantes: initial.parcelasRestantes,
          dataInicio: initial.dataInicio,
          valorParcela: initial.valorParcela,
          valorTotal: initial.valorTotal,
          categoria: initial.categoria ?? "Outros",
          semDataTermino: initial.semDataTermino ?? false,
          participantes: [],
        } : DEFAULTS,
      );
      setDividir(false);
      setParticipantes([]);
    }
  }, [open, initial, form]);

  // Auto-calc total when parcelada
  useEffect(() => {
    if (parcelada && totalParcelas && valorParcela) {
      const total = Number(totalParcelas) * Number(valorParcela);
      if (total > 0) form.setValue("valorTotal", total);
    }
  }, [parcelada, totalParcelas, valorParcela, form]);

  // When semDataTermino is set, disable parcelada
  useEffect(() => {
    if (semDataTermino) {
      form.setValue("parcelada", false);
      form.setValue("totalParcelas", null);
      form.setValue("parcelasRestantes", null);
    }
  }, [semDataTermino, form]);

  function addParticipante(tipo: "cadastrado" | "sem_cadastro") {
    if (tipo === "cadastrado") {
      setParticipantes((prev) => [...prev, { tipo: "cadastrado", username: "", status: "idle" }]);
    } else {
      setParticipantes((prev) => [...prev, { tipo: "sem_cadastro", nome: "", contato: "" }]);
    }
  }

  function removeParticipante(idx: number) {
    setParticipantes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateParticipante(idx: number, patch: Partial<ParticipanteEntry>) {
    setParticipantes((prev) =>
      prev.map((p, i) => i === idx ? { ...p, ...patch } as ParticipanteEntry : p),
    );
  }

  async function searchUser(idx: number) {
    const p = participantes[idx];
    if (p.tipo !== "cadastrado" || !p.username.trim()) return;
    updateParticipante(idx, { status: "loading" } as Partial<ParticipanteEntry>);
    try {
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(p.username.trim())}`);
      updateParticipante(idx, { status: res.ok ? "found" : "not_found" } as Partial<ParticipanteEntry>);
    } catch {
      updateParticipante(idx, { status: "not_found" } as Partial<ParticipanteEntry>);
    }
  }

  const totalPessoas = 1 + (dividir ? participantes.length : 0);
  const valorAtual = form.watch("valorTotal");
  const valorPorPessoa = totalPessoas > 1 ? (valorAtual || 0) / totalPessoas : null;

  const submit = form.handleSubmit(async (values) => {
    const n = (v: unknown) => Number(v) || 0;
    const valorTotalCalc = values.parcelada
      ? n(values.totalParcelas) * n(values.valorParcela)
      : n(values.valorTotal);

    const parsedParticipantes: Participante[] = dividir
      ? participantes
          .filter((p) => p.tipo === "sem_cadastro" ? p.nome.trim() !== "" : p.username.trim() !== "")
          .map((p): Participante =>
            p.tipo === "cadastrado"
              ? { tipo: "cadastrado", username: p.username.trim() }
              : { tipo: "sem_cadastro", nome: p.nome.trim(), contato: p.contato?.trim() || undefined },
          )
      : [];

    const payload: CompraInput = {
      ...values,
      valorTotal: valorTotalCalc > 0 ? valorTotalCalc : n(values.valorTotal),
      totalParcelas: values.parcelada ? values.totalParcelas : null,
      parcelasRestantes: values.parcelada ? (values.parcelasRestantes ?? values.totalParcelas) : null,
      valorParcela: values.parcelada ? n(values.valorParcela) : n(values.valorTotal),
      semDataTermino: values.semDataTermino ?? false,
      participantes: parsedParticipantes,
    };
    await onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar compra" : "Nova compra"}</DialogTitle>
          <DialogDescription>
            {initial ? "Atualize os detalhes desta compra." : "Registre uma nova compra."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          {/* Nome */}
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome da compra</Label>
            <Input id="nome" placeholder="Notebook, geladeira, curso…" {...form.register("nome")} />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          {/* Cartão / Pessoa */}
          <div className="grid gap-2">
            <Label htmlFor="cartaoOuPessoa">Cartão / Pessoa responsável</Label>
            <Input id="cartaoOuPessoa" placeholder="Nubank, Itaú, João…" {...form.register("cartaoOuPessoa")} />
            {form.formState.errors.cartaoOuPessoa && (
              <p className="text-xs text-destructive">{form.formState.errors.cartaoOuPessoa.message}</p>
            )}
          </div>

          {/* Categoria */}
          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input id="categoria" list="categorias-compra" placeholder="Eletrônicos, Alimentação…" {...form.register("categoria")} />
            <datalist id="categorias-compra">
              {CATEGORIAS_SUGERIDAS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Data */}
          <div className="grid gap-2">
            <Label htmlFor="dataInicio">Data de início</Label>
            <Input id="dataInicio" type="date" {...form.register("dataInicio")} />
          </div>

          {/* Sem data de término */}
          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm cursor-pointer">
            <Controller control={form.control} name="semDataTermino" render={({ field }) => (
              <input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={!!field.value} onChange={field.onChange} />
            )} />
            <div>
              <span className="font-medium">Sem data de término?</span>
              <p className="text-xs text-muted-foreground">Compra recorrente/indefinida (ex: assinatura, aluguel)</p>
            </div>
          </label>

          {/* Parcelado — oculto se semDataTermino */}
          {!semDataTermino && (
            <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm cursor-pointer">
              <Controller control={form.control} name="parcelada" render={({ field }) => (
                <input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={field.value} onChange={field.onChange} />
              )} />
              <span>É parcelada?</span>
            </label>
          )}

          {parcelada && !semDataTermino && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="totalParcelas">Número de parcelas</Label>
                <Input id="totalParcelas" type="number" min={1} placeholder="12" {...form.register("totalParcelas", { valueAsNumber: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valorParcela">Valor por parcela (R$)</Label>
                <Input id="valorParcela" type="number" step="0.01" inputMode="decimal" placeholder="0,00" {...form.register("valorParcela", { valueAsNumber: true })} />
              </div>
            </div>
          )}

          {/* Valor total */}
          <div className="grid gap-2">
            <Label htmlFor="valorTotal">{parcelada && !semDataTermino ? "Valor total (calculado)" : "Valor total (R$)"}</Label>
            <Input
              id="valorTotal" type="number" step="0.01" inputMode="decimal" placeholder="0,00"
              readOnly={parcelada && !semDataTermino}
              className={parcelada && !semDataTermino ? "bg-muted text-muted-foreground" : ""}
              {...form.register("valorTotal", { valueAsNumber: true })}
            />
            {form.formState.errors.valorTotal && (
              <p className="text-xs text-destructive">{form.formState.errors.valorTotal.message}</p>
            )}
            {valorPorPessoa !== null && (
              <p className="text-xs text-muted-foreground">
                Valor por pessoa: <strong>R$ {valorPorPessoa.toFixed(2)}</strong> ({totalPessoas} pessoas)
              </p>
            )}
          </div>

          {/* Dividir com outros — apenas na criação */}
          {!initial && (
            <>
              <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={dividir}
                  onChange={(e) => {
                    setDividir(e.target.checked);
                    if (!e.target.checked) setParticipantes([]);
                  }}
                />
                <div>
                  <span className="font-medium">Dividir com outras pessoas?</span>
                  <p className="text-xs text-muted-foreground">Valor dividido igualmente entre todos (incluindo você)</p>
                </div>
              </label>

              {dividir && (
                <div className="grid gap-3">
                  {participantes.map((p, idx) => (
                    <div key={idx} className={cn(
                      "rounded-xl border p-3 grid gap-2",
                      p.tipo === "cadastrado" ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30",
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          {p.tipo === "cadastrado"
                            ? <><UserCheck className="h-3.5 w-3.5 text-primary" /> Usuário cadastrado</>
                            : <><UserX className="h-3.5 w-3.5 text-muted-foreground" /> Sem cadastro</>
                          }
                        </span>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                          onClick={() => removeParticipante(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {p.tipo === "cadastrado" ? (
                        <div className="grid gap-1.5">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs select-none">@</span>
                              <Input
                                type="text"
                                placeholder="nome_do_usuario"
                                className="h-8 pl-6 text-sm"
                                value={p.username}
                                onChange={(e) => updateParticipante(idx, { username: e.target.value, status: "idle" } as Partial<ParticipanteEntry>)}
                              /></div>
                            <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0"
                              onClick={() => searchUser(idx)} disabled={p.status === "loading"}>
                              <Search className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {p.status === "found" && (
                            <p className="flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 className="h-3 w-3" /> Usuário encontrado
                            </p>
                          )}
                          {p.status === "not_found" && (
                            <p className="flex items-center gap-1 text-xs text-destructive">
                              <XCircle className="h-3 w-3" /> Usuário não encontrado — a compra não será espelhada para esta pessoa
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Nome da pessoa"
                            className="h-8 text-sm"
                            value={p.nome}
                            onChange={(e) => updateParticipante(idx, { nome: e.target.value } as Partial<ParticipanteEntry>)}
                          />
                          <Input
                            placeholder="Contato (opcional)"
                            className="h-8 text-sm"
                            value={p.contato}
                            onChange={(e) => updateParticipante(idx, { contato: e.target.value } as Partial<ParticipanteEntry>)}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
                      onClick={() => addParticipante("cadastrado")}>
                      <Plus className="h-3.5 w-3.5" />
                      Usuário cadastrado
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
                      onClick={() => addParticipante("sem_cadastro")}>
                      <Plus className="h-3.5 w-3.5" />
                      Pessoa sem cadastro
                    </Button>
                  </div>

                  {participantes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Adicione ao menos uma pessoa para dividir a compra.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

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
