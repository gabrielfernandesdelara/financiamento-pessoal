"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { CalendarClock, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { EmptyState } from "@/components/shared/empty-state";
import { Fab } from "@/components/shared/fab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/dashboard/chart-card";
import { CashFlowChart } from "@/components/forecast/cash-flow-chart";
import { CashFlowTable } from "@/components/forecast/cash-flow-table";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "@/hooks/use-transactions";
import {
  cashFlowProjection,
  splitByDate,
  uniqueCategories,
} from "@/lib/analytics";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Transaction, TransactionInput } from "@/types/transaction";
import Link from "next/link";

export default function ForecastPage() {
  const { status } = useSession();
  const { data, isLoading } = useTransactions();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);

  const transactions = data ?? [];
  const planned = React.useMemo(
    () =>
      splitByDate(transactions).planned.sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    [transactions],
  );
  const categories = React.useMemo(
    () => uniqueCategories(transactions),
    [transactions],
  );
  const projection = React.useMemo(
    () => cashFlowProjection(transactions),
    [transactions],
  );

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

  async function handleDelete(t: Transaction) {
    if (!confirm(`Excluir "${t.description}"?`)) return;
    try {
      await remove.mutateAsync(t.id);
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
        title="Painel"
        description="Veja uma projeção do seu fluxo de caixa para os próximos meses."
        action={
          <Link href="/previsoes" passHref>
            <Button className="hidden md:inline-flex">
              Adicionar previsão
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile
              icon={Wallet}
              label="Saldo atual"
              value={formatCurrency(projection.currentBalance)}
              tone={projection.currentBalance >= 0 ? "income" : "expense"}
            />
            <SummaryTile
              icon={CalendarClock}
              label={`Previsões lançadas`}
              value={`${planned.length} ${
                planned.length === 1 ? "lançamento" : "lançamentos"
              }`}
            />
            <SummaryTile
              icon={
                projection.endingBalance >= projection.currentBalance
                  ? TrendingUp
                  : TrendingDown
              }
              label="Saldo estimado no fim do ano"
              value={formatCurrency(projection.endingBalance)}
              tone={projection.endingBalance >= 0 ? "income" : "expense"}
            />
          </div>

          <ChartCard
            title="Fluxo de caixa estimado"
            description="Saldo projetado mês a mês considerando o que já aconteceu e o que está previsto."
          >
            <CashFlowChart
              months={projection.months}
              startingBalance={projection.startingBalance}
            />
          </ChartCard>

          <CashFlowTable months={projection.months} />
        </div>
      )}

      <Fab
        onClick={openCreate}
        label="Adicionar previsão"
        className="md:hidden"
      />

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

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={cn(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "income"
              ? "bg-success/10 text-success"
              : tone === "expense"
                ? "bg-destructive/10 text-destructive"
                : "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-lg font-semibold tracking-tight",
              tone === "income" && "text-success",
              tone === "expense" && "text-destructive",
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
