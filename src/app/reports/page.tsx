"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { PieChart } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import {
  expensesByCategory,
  monthlyTimeline,
  totalsFor,
} from "@/lib/analytics";
import { ChartCard } from "@/components/dashboard/chart-card";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { CategoryPie } from "@/components/dashboard/category-pie";
import { MonthlyBar } from "@/components/dashboard/monthly-bar";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const { status } = useSession();
  const { data, isLoading } = useTransactions();

  const reports = useMemo(() => {
    const txs = data ?? [];
    const totals = totalsFor(txs);
    return {
      totals,
      timeline: monthlyTimeline(txs, 12),
      categories: expensesByCategory(txs),
      txs,
    };
  }, [data]);

  if (status === "loading") return <Skeleton className="h-64" />;
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Tendências de longo prazo das suas finanças."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : reports.txs.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Sem relatórios ainda"
          description="Adicione algumas transações para gerar relatórios."
        />
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Receita total"
              value={reports.totals.income}
              tone="income"
            />
            <SummaryCard
              label="Despesa total"
              value={reports.totals.expense}
              tone="expense"
            />
            <SummaryCard
              label="Saldo líquido"
              value={reports.totals.balance}
            />
          </div>

          <ChartCard
            title="Saldo dos últimos 12 meses"
            description="Saldo líquido mensal no último ano"
          >
            <BalanceChart data={reports.timeline} />
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
            <ChartCard
              title="Receitas vs despesas"
              description="Comparação mensal"
            >
              <MonthlyBar data={reports.timeline} />
            </ChartCard>
            <ChartCard
              title="Categorias de despesa (todo o período)"
              description="Para onde seu dinheiro foi"
            >
              <CategoryPie data={reports.categories} />
            </ChartCard>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "income" | "expense";
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p
          className={`mt-2 text-2xl font-semibold tracking-tight md:text-3xl ${
            tone === "income"
              ? "text-success"
              : tone === "expense"
                ? "text-destructive"
                : ""
          }`}
        >
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  );
}
