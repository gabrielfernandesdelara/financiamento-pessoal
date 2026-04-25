"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { ShoppingBag, Bell, Gift, History, AlertCircle, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { HistoricoItem } from "@/services/sheets";

async function fetchHistorico(): Promise<HistoricoItem[]> {
  const res = await fetch("/api/historico", { cache: "no-store" });
  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    console.error("[historico] fetch error:", res.status, msg);
    throw new Error(`Falha ao carregar histórico: ${res.status}`);
  }
  return res.json() as Promise<HistoricoItem[]>;
}

const iconMap = {
  compra:   ShoppingBag,
  cobranca: Bell,
  bonus:    Gift,
};

const colorMap = {
  compra:   "bg-primary/10 text-primary",
  cobranca: "bg-destructive/10 text-destructive",
  bonus:    "bg-success/10 text-success",
};

function matchSearch(item: HistoricoItem, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    item.titulo.toLowerCase().includes(lower) ||
    item.subtitulo.toLowerCase().includes(lower) ||
    (item.info ?? "").toLowerCase().includes(lower) ||
    (item.dividido_com ?? []).some((n) => n.toLowerCase().includes(lower))
  );
}

export default function HistoricoPage() {
  const { status } = useSession();
  const { data, isLoading, error } = useQuery<HistoricoItem[]>({
    queryKey: ["historico"],
    queryFn: fetchHistorico,
    retry: 1,
  });

  const [busca, setBusca] = React.useState("");

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }
  if (status === "unauthenticated") return <SignInRequired />;

  const allItems = data ?? [];
  const items = busca.trim() ? allItems.filter((i) => matchSearch(i, busca.trim())) : allItems;

  return (
    <>
      <PageHeader
        title="Histórico"
        description="Registro de todas as suas compras, cobranças e bônus."
      />

      {/* Campo de busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome, categoria, cartão, cobrança…"
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Erro ao carregar histórico</p>
            <p className="text-xs opacity-80">{String(error)}</p>
            <p className="mt-1 text-xs opacity-70">
              Execute a função <code>get_historico</code> no SQL Editor do Supabase (ver schema.sql) para melhor compatibilidade.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={History}
          title={busca ? "Nenhum resultado encontrado" : "Histórico vazio"}
          description={busca ? `Nenhum item corresponde a "${busca}".` : "Adicione compras, cobranças ou bônus para vê-los aqui."}
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = iconMap[item.tipo];
            const positivo = item.tipo !== "compra";
            const temDividida = item.tipo === "compra" && item.dividido_com && item.dividido_com.length > 0;
            return (
              <Card key={`${item.tipo}-${item.id}`}>
                <CardContent className="flex items-start gap-3 px-4 py-3">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", colorMap[item.tipo])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitulo}</p>
                    {temDividida && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-500">
                        <Users className="h-3 w-3 shrink-0" />
                        Dividida com: {item.dividido_com!.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-semibold", positivo ? "text-success" : "text-foreground")}>
                      {positivo ? "+" : ""}{formatCurrency(item.valor)}
                    </p>
                    {item.info && (
                      <p className="text-xs text-muted-foreground">{item.info}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.data_ref ? formatDate(item.data_ref.slice(0, 10)) : ""}
                    </p>
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
