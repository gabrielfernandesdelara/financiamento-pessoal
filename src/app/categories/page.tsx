"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Tags } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

type Stat = {
  category: string;
  income: number;
  expense: number;
  count: number;
};

function buildStats(transactions: Transaction[]): Stat[] {
  const map = new Map<string, Stat>();
  for (const t of transactions) {
    const stat = map.get(t.category) ?? {
      category: t.category,
      income: 0,
      expense: 0,
      count: 0,
    };
    stat.count += 1;
    if (t.type === "income") stat.income += t.amount;
    else stat.expense += t.amount;
    map.set(t.category, stat);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.expense + b.income - (a.expense + a.income),
  );
}

export default function CategoriesPage() {
  const { status } = useSession();
  const { data, isLoading } = useTransactions();
  const stats = useMemo(() => buildStats(data ?? []), [data]);
  const max = Math.max(1, ...stats.map((s) => s.expense + s.income));

  if (status === "loading") return <Skeleton className="h-64" />;
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Detalhamento de cada categoria utilizada."
      />

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria ainda"
          description="Adicione uma transação para ver categorias aqui."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((s) => {
            const total = s.expense + s.income;
            const ratio = total / max;
            return (
              <Card key={s.category}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{s.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.count} {s.count === 1 ? "transação" : "transações"}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-base font-semibold",
                        s.expense > s.income
                          ? "text-destructive"
                          : "text-success",
                      )}
                    >
                      {formatCurrency(s.income - s.expense)}
                    </p>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Receitas {formatCurrency(s.income)}</span>
                    <span>Despesas {formatCurrency(s.expense)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
