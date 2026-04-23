"use client";

import { Card } from "@/components/ui/card";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ParsedRow } from "@/lib/csv/parser";

type Props = {
  rows: ParsedRow[];
  duplicates: Set<string>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
};

export function PreviewTable({
  rows,
  duplicates,
  selected,
  onToggle,
  onToggleAll,
}: Props) {
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && selected.size < rows.length;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(217_89%_53%)]"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isDup = duplicates.has(row.id);
              const isChecked = selected.has(row.id);
              const isIncome = row.type === "income";
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border/40 last:border-0 hover:bg-secondary/30",
                    isDup && "opacity-60",
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(217_89%_53%)]"
                      checked={isChecked}
                      onChange={() => onToggle(row.id)}
                      aria-label={`Selecionar ${row.description}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{row.description}</span>
                      {isDup && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                          Já existe
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.category}
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
                      "whitespace-nowrap px-4 py-3 text-right font-semibold",
                      isIncome ? "text-success" : "text-destructive",
                    )}
                  >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(row.amount)}
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
