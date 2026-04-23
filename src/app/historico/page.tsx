"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { ShoppingBag, Bell, Gift, History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Compra } from "@/types/compra";
import type { Cobranca } from "@/types/cobranca";

type HistoricoData = {
  compras: Compra[];
  cobrancas: Cobranca[];
  bonuses: { id: string; valor: number; descricao: string; created_at: string }[];
};

type HistItem = {
  id: string;
  tipo: "compra" | "cobranca" | "bonus";
  titulo: string;
  subtitulo: string;
  valor: number;
  data: string;
  status?: string;
  positivo?: boolean;
};

function normalize(data: HistoricoData): HistItem[] {
  const items: HistItem[] = [
    ...data.compras.map(c => ({
      id: c.id,
      tipo: "compra" as const,
      titulo: c.nome,
      subtitulo: `${c.cartaoOuPessoa}${c.categoria ? ` · ${c.categoria}` : ""}`,
      valor: c.valorTotal,
      data: c.createdAt ?? c.dataInicio,
      status: c.quitada ? "Quitada" : c.parcelada ? `${c.parcelasRestantes ?? 0} parcelas restantes` : "À vista",
      positivo: false,
    })),
    ...data.cobrancas.map(c => ({
      id: c.id,
      tipo: "cobranca" as const,
      titulo: c.nomePessoa,
      subtitulo: `${c.nomeCompra} · Venc. ${formatDate(c.dataVencimento)}`,
      valor: c.valorDevido,
      data: c.createdAt ?? c.dataVencimento,
      status: "A receber",
      positivo: true,
    })),
    ...data.bonuses.map(b => ({
      id: b.id,
      tipo: "bonus" as const,
      titulo: `Bônus: ${b.descricao}`,
      subtitulo: "Renda extra",
      valor: b.valor,
      data: b.created_at,
      positivo: true,
    })),
  ];
  return items.sort((a, b) => b.data.localeCompare(a.data));
}

async function fetchHistorico(): Promise<HistoricoData> {
  const res = await fetch("/api/historico", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar histórico");
  return res.json() as Promise<HistoricoData>;
}

const iconMap = {
  compra: ShoppingBag,
  cobranca: Bell,
  bonus: Gift,
};

const colorMap = {
  compra: "bg-primary/10 text-primary",
  cobranca: "bg-destructive/10 text-destructive",
  bonus: "bg-success/10 text-success",
};

export default function HistoricoPage() {
  const { status } = useSession();
  const { data, isLoading } = useQuery<HistoricoData>({
    queryKey: ["historico"],
    queryFn: fetchHistorico,
  });

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }
  if (status === "unauthenticated") return <SignInRequired />;

  const items = data ? normalize(data) : [];

  return (
    <>
      <PageHeader
        title="Histórico"
        description="Registro de todas as suas compras, cobranças e bônus."
      />

      {isLoading ? (
        <div className="space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={History}
          title="Histórico vazio"
          description="Adicione compras, cobranças ou bônus para vê-los aqui."
        />
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const Icon = iconMap[item.tipo];
            return (
              <Card key={`${item.tipo}-${item.id}`}>
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", colorMap[item.tipo])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitulo}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-semibold", item.positivo ? "text-success" : "text-foreground")}>
                      {item.positivo ? "+" : ""}{formatCurrency(item.valor)}
                    </p>
                    {item.status && (
                      <p className="text-xs text-muted-foreground">{item.status}</p>
                    )}
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
