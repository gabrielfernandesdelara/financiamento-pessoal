"use client";

import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

type Props = {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
};

export function TransactionCard({ transaction, onEdit, onDelete }: Props) {
  const isIncome = transaction.type === "income";
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
          isIncome
            ? "bg-success/10 text-success"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {isIncome ? (
          <ArrowUpRight className="h-5 w-5" />
        ) : (
          <ArrowDownLeft className="h-5 w-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {transaction.description}
          </p>
          <p
            className={cn(
              "text-sm font-semibold",
              isIncome ? "text-success" : "text-destructive",
            )}
          >
            {isIncome ? "+" : "−"}
            {formatCurrency(transaction.amount)}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {transaction.category} · {formatDate(transaction.date)}
            {transaction.recurring && " · recorrente"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Editar"
          onClick={() => onEdit(transaction)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Excluir"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
