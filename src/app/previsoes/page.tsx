"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { CalendarClock, Pencil, Trash2, Info, Repeat2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Fab } from "@/components/shared/fab";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { PrevisaoForm } from "@/components/previsoes/previsao-form";
import { usePrevisoes, useCreatePrevisao, useUpdatePrevisao, useDeletePrevisao } from "@/hooks/use-previsoes";
import { useProfile } from "@/hooks/use-profile";
import { useCompras } from "@/hooks/use-compras";
import { useBonuses } from "@/hooks/use-bonuses";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { projecaoComPrevisoes } from "@/lib/compras-analytics";
import type { Previsao, PrevisaoInput } from "@/types/previsao";

export default function PrevisoesPage() {
  const { status } = useSession();
  const { data, isLoading } = usePrevisoes();
  const { data: profile } = useProfile();

  const create = useCreatePrevisao();
  const update = useUpdatePrevisao();
  const remove = useDeletePrevisao();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Previsao | null>(null);

  const previsoes   = data ?? [];
  const saldoAtual  = profile?.saldoRestante ?? 0;
  const salario     = profile?.salario ?? 0;

  const { data: comprasData } = useCompras();
  const { data: bonusesData } = useBonuses();
  const compras = comprasData ?? [];
  const bonuses = bonusesData ?? [];

  const projecao = React.useMemo(
    () => projecaoComPrevisoes(previsoes, compras, bonuses, saldoAtual, salario, 6),
    [previsoes, compras, bonuses, saldoAtual, salario],
  );

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(p: Previsao) { setEditing(p); setOpen(true); }

  async function handleSubmit(input: PrevisaoInput) {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast({ title: "Previsão atualizada", variant: "success" });
      } else {
        await create.mutateAsync(input);
        toast({ title: "Previsão adicionada", variant: "success" });
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: "Algo deu errado",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(p: Previsao) {
    if (!confirm(`Excluir "${p.descricao}"?`)) return;
    try {
      await remove.mutateAsync(p.id);
      toast({ title: "Previsão removida", variant: "success" });
    } catch (err) {
      toast({
        title: "Falha ao excluir",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  if (status === "loading") return <Skeleton className="h-64" />;
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader
        title="Previsões"
        description="Simule compras futuras e veja o impacto no seu saldo."
        action={
          <Button className="hidden md:inline-flex" onClick={openCreate}>
            Nova previsão
          </Button>
        }
      />

      {/* Aviso de simulação */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          As previsões são <strong>apenas simulações</strong>. Elas não afetam o saldo real, compras ou qualquer outro cálculo do sistema — servem só para projetar cenários futuros.
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-6">
          {/* Projeção de simulação */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-1 text-sm font-semibold">Simulação: próximos 6 meses</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Receita acumulada: saldo restante ({formatCurrency(saldoAtual)}) + salário ({formatCurrency(salario)}) por mês, acumulando mês a mês − previsões e compras do mês
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-1.5 text-left">Mês</th>
                      <th className="py-1.5 text-right">Receita</th>
                      <th className="py-1.5 text-right">Previsto</th>
                      <th className="py-1.5 text-right font-semibold">Saldo simulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projecao.map((p) => (
                      <tr key={p.month} className="border-b border-border/40">
                        <td className="py-1.5 font-medium">{p.month}</td>
                        <td className="py-1.5 text-right text-success">{formatCurrency(p.income)}</td>
                        <td className="py-1.5 text-right text-destructive">{formatCurrency(p.expense)}</td>
                        <td className={cn(
                          "py-1.5 text-right font-semibold",
                          p.balance >= 0 ? "text-success" : "text-destructive",
                        )}>
                          {formatCurrency(p.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Lista de previsões */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Lançamentos simulados
              </h2>
              <span className="text-xs text-muted-foreground">
                {previsoes.length} {previsoes.length === 1 ? "previsão" : "previsões"}
              </span>
            </div>

            {previsoes.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nenhuma previsão cadastrada"
                description="Adicione uma previsão para simular o impacto no seu saldo."
                action={<Button onClick={openCreate}>Nova previsão</Button>}
              />
            ) : (
              <div className="space-y-2">
                {previsoes.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate font-medium">{p.descricao}</p>
                          {p.recorrente && (
                            <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                              <Repeat2 className="h-3 w-3" />
                              Recorrente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.recorrente ? `A partir de ${formatDate(p.dataPrevista)}` : formatDate(p.dataPrevista)}
                          {p.parcelada && p.totalParcelas
                            ? ` · ${p.totalParcelas}x ${formatCurrency(p.valorParcela)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="mr-2 font-semibold">{formatCurrency(p.valor)}</span>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <Fab onClick={openCreate} label="Nova previsão" className="md:hidden" />

      <PrevisaoForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />
    </>
  );
}
