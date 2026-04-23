"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Receipt, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Fab } from "@/components/shared/fab";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TransactionFiltersBar } from "@/components/transactions/transaction-filters";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionTotalsFooter } from "@/components/transactions/transaction-totals-footer";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "@/hooks/use-transactions";
import {
  availableMonths,
  splitByDate,
  uniqueCategories,
} from "@/lib/analytics";
import { monthKey } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SignInRequired } from "@/components/shared/sign-in-required";
import type {
  Transaction,
  TransactionFilters,
  TransactionInput,
} from "@/types/transaction";
import { useQueryClient } from "@tanstack/react-query";

export default function HistoricoPage() {
  const { status } = useSession();
  const { data, isLoading } = useTransactions();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const qc = useQueryClient();

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [filters, setFilters] = React.useState<TransactionFilters>({});
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [deletingAll, setDeletingAll] = React.useState(false);

  const transactions = data ?? [];
  const realized = React.useMemo(
    () => splitByDate(transactions).realized,
    [transactions],
  );
  const categories = React.useMemo(() => uniqueCategories(realized), [realized]);
  const months = React.useMemo(() => availableMonths(realized), [realized]);

  const filtered = React.useMemo(() => {
    const search = filters.search?.trim().toLowerCase();
    return realized
      .filter((t) => {
        if (filters.month && monthKey(t.date) !== filters.month) return false;
        if (filters.type && t.type !== filters.type) return false;
        if (filters.category && t.category !== filters.category) return false;
        if (filters.from && t.date < filters.from) return false;
        if (filters.to && t.date > filters.to) return false;
        if (search && !t.description.toLowerCase().includes(search)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [realized, filters]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(t: Transaction) {
    setEditing(t);
    setOpen(true);
  }

  async function handleSubmit(input: TransactionInput) {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast({ title: "Transação atualizada", variant: "success" });
      } else {
        await create.mutateAsync(input);
        toast({ title: "Transação adicionada", variant: "success" });
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

  async function handleDelete(t: Transaction) {
    if (!confirm(`Excluir "${t.description}"?`)) return;
    try {
      await remove.mutateAsync(t.id);
      toast({ title: "Transação removida", variant: "success" });
    } catch (err) {
      toast({
        title: "Falha ao excluir",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteAll() {
    if (
      !confirm(
        `Excluir TODAS as ${transactions.length} transações? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      setDeletingAll(true);
      const res = await fetch("/api/transactions", { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      await qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Histórico apagado", variant: "success" });
    } catch (err) {
      toast({
        title: "Falha ao excluir",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingAll(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader
        title="Histórico"
        description="Todas as suas receitas e despesas em um só lugar."
        action={
          <div className="hidden gap-2 md:flex">
            {transactions.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Excluir tudo
              </Button>
            )}
            <Button onClick={openCreate}>Adicionar transação</Button>
          </div>
        }
      />

      <div className="space-y-4">
        <TransactionFiltersBar
          value={filters}
          onChange={setFilters}
          categories={categories}
          months={months}
        />

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma transação encontrada"
            description="Ajuste os filtros ou adicione uma nova transação."
            action={<Button onClick={openCreate}>Adicionar transação</Button>}
          />
        ) : (
          <>
            <TransactionTotalsFooter transactions={filtered} />
            {isDesktop ? (
              <TransactionTable transactions={filtered} onEdit={openEdit} onDelete={handleDelete} />
            ) : (
              <div className="space-y-3">
                {filtered.map((t) => (
                  <TransactionCard key={t.id} transaction={t} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Fab onClick={openCreate} label="Adicionar" className="md:hidden" />

      <TransactionForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        categories={categories}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />
    </>
  );
}
