"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

type SortKey = "date" | "amount" | "description" | "category";
type SortDir = "asc" | "desc";

type Props = {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
};

export function TransactionTable({ transactions, onEdit, onDelete }: Props) {
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });

  const sorted = React.useMemo(() => {
    const arr = [...transactions];
    arr.sort((a, b) => {
      let res = 0;
      if (sort.key === "amount") res = a.amount - b.amount;
      else res = String(a[sort.key]).localeCompare(String(b[sort.key]));
      return sort.dir === "asc" ? res : -res;
    });
    return arr;
  }, [transactions, sort]);

  function toggle(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <Th sortKey="date" sort={sort} onClick={toggle}>
                Data
              </Th>
              <Th sortKey="description" sort={sort} onClick={toggle}>
                Descrição
              </Th>
              <Th sortKey="category" sort={sort} onClick={toggle}>
                Categoria
              </Th>
              <th className="px-4 py-3">Tipo</th>
              <Th sortKey="amount" sort={sort} onClick={toggle} align="right">
                Valor
              </Th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const isIncome = t.type === "income";
              return (
                <tr
                  key={t.id}
                  className="border-b border-border/40 last:border-0 hover:bg-secondary/30"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {t.description}
                    {t.recurring && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                        Recorrente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.category}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        isIncome
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {isIncome ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-semibold",
                      isIncome ? "text-success" : "text-destructive",
                    )}
                  >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(t)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(t)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({
  children,
  sortKey,
  sort,
  onClick,
  align = "left",
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {children}
        {active &&
          (sort.dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}
