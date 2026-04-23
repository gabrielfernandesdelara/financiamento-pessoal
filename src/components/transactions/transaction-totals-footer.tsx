"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { totalsFor } from "@/lib/analytics";
import type { Transaction } from "@/types/transaction";

type Props = {
  transactions: Transaction[];
};

export function TransactionTotalsFooter({ transactions }: Props) {
  const totals = totalsFor(transactions);
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-4 sm:items-center sm:p-5">
        <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total no filtro
          </span>
          <span className="text-sm font-medium">
            {transactions.length}{" "}
            {transactions.length === 1 ? "lançamento" : "lançamentos"}
          </span>
        </div>
        <Tile label="Receitas" value={totals.income} tone="income" />
        <Tile label="Despesas" value={totals.expense} tone="expense" />
        <Tile
          label="Saldo"
          value={totals.balance}
          tone={totals.balance >= 0 ? "income" : "expense"}
        />
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-semibold tracking-tight sm:text-lg",
          tone === "income" ? "text-success" : "text-destructive",
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
