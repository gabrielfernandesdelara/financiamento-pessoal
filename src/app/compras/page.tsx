"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { QuintoDiaPopup } from "@/components/compras/quinto-dia-popup";
import { useCompras } from "@/hooks/use-compras";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Compra } from "@/types/compra";
import { differenceInCalendarMonths, parseISO } from "date-fns";

function parcelasRestantesAtual(compra: Compra): number {
  if (!compra.parcelada || !compra.totalParcelas) return 0;
  const elapsed = differenceInCalendarMonths(new Date(), parseISO(compra.dataInicio));
  return Math.max(0, compra.totalParcelas - elapsed);
}

type CardStyle = "many" | "few" | "last" | "done" | "avista";

function getCardStyle(compra: Compra, restantes: number): CardStyle {
  if (!compra.parcelada) return "avista";
  if (restantes === 0) return "done";
  if (restantes <= 2) return "last";
  if (restantes <= 5) return "few";
  return "many";
}

const cardStyles: Record<CardStyle, string> = {
  many: "border-l-4 border-l-primary bg-gradient-to-r from-primary/15 to-transparent",
  few:  "border-l-4 border-l-purple-400 bg-gradient-to-r from-purple-400/10 to-transparent",
  last: "border-l-4 border-l-accent-foreground bg-gradient-to-r from-accent/60 to-transparent",
  done: "border-l-4 border-l-success bg-success/5 opacity-70",
  avista: "border-l-4 border-l-primary/40 bg-primary/5",
};

const labelStyles: Record<CardStyle, string> = {
  many:   "bg-primary/20 text-primary",
  few:    "bg-purple-400/20 text-purple-400",
  last:   "bg-accent text-accent-foreground",
  done:   "bg-success/20 text-success",
  avista: "bg-primary/10 text-primary",
};

function StatusBadge({ style, parcelada }: { style: CardStyle; parcelada: boolean }) {
  const text =
    style === "done"   ? "Quitada" :
    style === "avista" ? "À vista" :
    style === "last"   ? "Quase lá!" :
    parcelada          ? "Parcelada" : "À vista";

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", labelStyles[style])}>
      {text}
    </span>
  );
}

export default function ComprasPage() {
  const { status } = useSession();
  const { data, isLoading } = useCompras();
  const compras = data ?? [];

  if (status === "loading") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <QuintoDiaPopup />
      <PageHeader title="Compras" description="Todas as suas compras e parcelas em andamento." />

      <div className="space-y-2">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
        ) : compras.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhuma compra registrada"
            description="Adicione uma compra na aba Adicionar."
          />
        ) : (
          compras.map((compra) => {
            const restantes = parcelasRestantesAtual(compra);
            const style = getCardStyle(compra, restantes);

            return (
              <div
                key={compra.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 transition-opacity",
                  cardStyles[style],
                )}
              >
                {/* Linha 1: nome + badge */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <p className="font-semibold text-sm leading-tight">{compra.nome}</p>
                  <StatusBadge style={style} parcelada={compra.parcelada} />
                </div>

                {/* Grid de campos na ordem exata pedida */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  <Field label="Cartão / Pessoa" value={compra.cartaoOuPessoa} />
                  <Field
                    label="Parcelas restantes"
                    value={compra.parcelada ? `${restantes} / ${compra.totalParcelas}` : "—"}
                    highlight={style === "last" || style === "few"}
                  />
                  <Field label="Data de início" value={formatDate(compra.dataInicio)} />
                  <Field
                    label="Valor da parcela"
                    value={compra.parcelada ? formatCurrency(compra.valorParcela) : "—"}
                  />
                  <Field label="Valor total" value={formatCurrency(compra.valorTotal)} bold />
                  <Field label="Parcelada" value={compra.parcelada ? "Sim" : "Não"} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function Field({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={cn("font-medium", bold && "text-foreground font-semibold", highlight && "text-primary")}>{value}</p>
    </div>
  );
}
