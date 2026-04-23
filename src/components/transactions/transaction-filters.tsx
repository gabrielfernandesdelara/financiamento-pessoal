"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MonthOption } from "@/lib/analytics";
import type { TransactionFilters } from "@/types/transaction";

type Props = {
  value: TransactionFilters;
  onChange: (next: TransactionFilters) => void;
  categories: string[];
  months: MonthOption[];
};

export function TransactionFiltersBar({
  value,
  onChange,
  categories,
  months,
}: Props) {
  function update<K extends keyof TransactionFilters>(
    key: K,
    next: TransactionFilters[K] | undefined,
  ) {
    onChange({ ...value, [key]: next || undefined });
  }

  const hasFilters = Object.values(value).some(Boolean);

  return (
    <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft md:grid-cols-5">
      <div className="grid gap-1.5 md:col-span-5">
        <Label htmlFor="search">Buscar na descrição</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            type="search"
            value={value.search ?? ""}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Ex.: Receita Federal"
            className="pl-9"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Mês</Label>
        <Select
          value={value.month ?? "all"}
          onValueChange={(v) => update("month", v === "all" ? undefined : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Tipo</Label>
        <Select
          value={value.type ?? "all"}
          onValueChange={(v) =>
            update("type", v === "all" ? undefined : (v as "income" | "expense"))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receita</SelectItem>
            <SelectItem value="expense">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Categoria</Label>
        <Select
          value={value.category ?? "all"}
          onValueChange={(v) =>
            update("category", v === "all" ? undefined : v)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="from">De</Label>
        <Input
          id="from"
          type="date"
          value={value.from ?? ""}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="to">Até</Label>
        <Input
          id="to"
          type="date"
          value={value.to ?? ""}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>
      {hasFilters && (
        <div className="md:col-span-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({})}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
