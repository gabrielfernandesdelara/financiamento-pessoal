"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Tags } from "lucide-react";
import { useCompras } from "@/hooks/use-compras";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { cn, formatCurrency } from "@/lib/utils";
import { totalPorCategoria } from "@/lib/compras-analytics";
import { CategoryPie } from "@/components/dashboard/category-pie";
import { ChartCard } from "@/components/dashboard/chart-card";

export default function CategoriesPage() {
  const { status } = useSession();
  const { data, isLoading } = useCompras();
  const [search, setSearch] = useState("");

  const compras = data ?? [];

  const stats = useMemo(() => totalPorCategoria(compras), [compras]);
  const pieData = useMemo(() =>
    stats.map(s => ({ category: s.categoria, total: s.total })),
    [stats],
  );
  const max = Math.max(1, ...stats.map(s => s.total));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? stats.filter(s => s.categoria.toLowerCase().includes(q)) : stats;
  }, [stats, search]);

  if (status === "loading") return <Skeleton className="h-64" />;
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Detalhamento de gastos por categoria."
      />

      {isLoading ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : stats.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria ainda"
          description="Adicione compras com categoria para ver o detalhamento aqui."
        />
      ) : (
        <div className="space-y-6">
          {/* Gráfico de pizza */}
          <ChartCard title="Gastos por categoria" description="Proporção do valor total de cada categoria">
            <CategoryPie data={pieData} />
          </ChartCard>

          {/* Busca */}
          <input
            type="search"
            placeholder="Buscar categoria…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Lista de categorias */}
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(s => {
              const ratio = s.total / max;
              const categoryCompras = compras.filter(c => c.categoria === s.categoria);
              return (
                <Card key={s.categoria}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{s.categoria}</p>
                        <p className="text-xs text-muted-foreground">{s.count} {s.count === 1 ? "compra" : "compras"}</p>
                      </div>
                      <p className="text-base font-semibold text-destructive">
                        {formatCurrency(s.total)}
                      </p>
                    </div>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${ratio * 100}%` }} />
                    </div>

                    {/* Compras desta categoria (simplificado) */}
                    {categoryCompras.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {categoryCompras.slice(0, 3).map(c => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className={cn("truncate text-muted-foreground", c.quitada && "line-through opacity-60")}>
                              {c.nome}
                              {c.parcelada && c.parcelasRestantes ? ` (${c.parcelasRestantes}x)` : ""}
                            </span>
                            <span className="ml-2 shrink-0 font-medium">
                              {formatCurrency(c.valorTotal)}
                            </span>
                          </div>
                        ))}
                        {categoryCompras.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{categoryCompras.length - 3} mais</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
