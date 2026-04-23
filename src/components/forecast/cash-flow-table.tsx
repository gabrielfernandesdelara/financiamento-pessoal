"use client";

import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { CashFlowMonth } from "@/lib/analytics";

type Props = {
  months: CashFlowMonth[];
};

export function CashFlowTable({ months }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Mês</th>
              <th className="px-4 py-3 text-right">Saldo inicial</th>
              <th className="px-4 py-3 text-right">Receitas</th>
              <th className="px-4 py-3 text-right">Despesas</th>
              <th className="px-4 py-3 text-right">Saldo final</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr
                key={m.month}
                className={cn(
                  "border-b border-border/40 last:border-0",
                  m.isCurrent && "bg-accent/40",
                )}
              >
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {m.label}
                    {m.isCurrent && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                        Atual
                      </span>
                    )}
                    {m.hasPlanned && !m.isCurrent && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                        Previsto
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right",
                    m.openingBalance < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {formatCurrency(m.openingBalance)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-success">
                  {m.income > 0 ? `+${formatCurrency(m.income)}` : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-destructive">
                  {m.expense > 0 ? `−${formatCurrency(m.expense)}` : "—"}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right font-semibold",
                    m.closingBalance >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {formatCurrency(m.closingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
