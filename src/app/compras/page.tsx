"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { ShoppingBag, CheckCircle, CreditCard, Wallet, TrendingUp, TrendingDown, BadgeDollarSign } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { QuintoDiaPopup } from "@/components/compras/quinto-dia-popup";
import { useCompras, usePagarCompra } from "@/hooks/use-compras";
import { useProfile } from "@/hooks/use-profile";
import { useBonuses } from "@/hooks/use-bonuses";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Compra } from "@/types/compra";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRestantes(c: Compra): number {
  return c.parcelasRestantes ?? 0;
}

type CardStyle = "many" | "few" | "last" | "avista";

function getCardStyle(c: Compra): CardStyle {
  if (!c.parcelada) return "avista";
  const r = getRestantes(c);
  if (r <= 2) return "last";
  if (r <= 5) return "few";
  return "many";
}

const cardStyles: Record<CardStyle, string> = {
  many:   "border-l-4 border-l-primary bg-gradient-to-r from-primary/15 to-transparent",
  few:    "border-l-4 border-l-purple-400 bg-gradient-to-r from-purple-400/10 to-transparent",
  last:   "border-l-4 border-l-accent-foreground bg-gradient-to-r from-accent/60 to-transparent",
  avista: "border-l-4 border-l-primary/40 bg-primary/5",
};

const badgeStyles: Record<CardStyle, string> = {
  many:   "bg-primary/20 text-primary",
  few:    "bg-purple-400/20 text-purple-400",
  last:   "bg-accent text-accent-foreground",
  avista: "bg-primary/10 text-primary",
};

const badgeLabels: Record<CardStyle, string> = {
  many:   "Parcelada",
  few:    "Parcelada",
  last:   "Quase lá!",
  avista: "À vista",
};

// ── Seção: Resumo Financeiro ──────────────────────────────────────────────────

function ResumoFinanceiro({ compras }: { compras: Compra[] }) {
  const { data: profile } = useProfile();
  const { data: bonuses } = useBonuses();

  const totalDoMes = compras.reduce((sum, c) => {
    if (c.parcelada) {
      return getRestantes(c) > 0 ? sum + c.valorParcela : sum;
    }
    return sum + c.valorTotal;
  }, 0);

  const valorTotalGeral = compras.reduce((sum, c) => sum + c.valorTotal, 0);
  const totalBonuses = (bonuses ?? []).reduce((sum, b) => sum + b.valor, 0);
  const sobrouNoMes = (profile?.salario ?? 0) + totalBonuses - totalDoMes;
  const saldoFinal = (profile?.saldoRestante ?? 0) + sobrouNoMes;

  return (
    <div className="mb-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
        Resumo Financeiro
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile
          icon={CreditCard}
          label="Valor total do Mês"
          value={formatCurrency(totalDoMes)}
          tone="expense"
        />
        <MetricTile
          icon={ShoppingBag}
          label="Valor Total"
          value={formatCurrency(valorTotalGeral)}
        />
        <MetricTile
          icon={sobrouNoMes >= 0 ? TrendingUp : TrendingDown}
          label="Sobrou no Mês"
          value={formatCurrency(sobrouNoMes)}
          tone={sobrouNoMes >= 0 ? "income" : "expense"}
        />
        <MetricTile
          icon={sobrouNoMes >= 0 ? Wallet : BadgeDollarSign}
          label="Saldo Final"
          value={formatCurrency(saldoFinal)}
          tone={saldoFinal >= 0 ? "income" : "expense"}
        />
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-background/60 p-3 backdrop-blur">
      <span className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
        tone === "income"  ? "bg-success/15 text-success"
          : tone === "expense" ? "bg-destructive/15 text-destructive"
          : "bg-accent text-accent-foreground",
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn(
          "text-sm font-bold",
          tone === "income"  && "text-success",
          tone === "expense" && "text-destructive",
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function ComprasPage() {
  const { status } = useSession();
  const { data, isLoading } = useCompras();
  const pagar = usePagarCompra();

  const [confirmando, setConfirmando] = React.useState<Compra | null>(null);

  const compras = data ?? [];

  async function handlePagar() {
    if (!confirmando) return;
    try {
      await pagar.mutateAsync(confirmando.id);
      toast({
        title: confirmando.parcelada ? "Parcela paga!" : "Compra quitada!",
        variant: "success",
      });
      setConfirmando(null);
    } catch (err) {
      toast({
        title: "Erro ao registrar pagamento",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <QuintoDiaPopup />
      <PageHeader title="Compras" description="Suas compras ativas e parcelas em andamento." />

      {/* Resumo financeiro sempre visível */}
      {!isLoading && <ResumoFinanceiro compras={compras} />}

      {/* Lista de compras */}
      <div className="space-y-2">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
        ) : compras.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhuma compra ativa"
            description="Adicione uma compra na aba Adicionar."
          />
        ) : (
          compras.map((c) => {
            const restantes = getRestantes(c);
            const style = getCardStyle(c);

            return (
              <div
                key={c.id}
                className={cn("rounded-xl border px-3 py-2.5 transition-opacity", cardStyles[style])}
              >
                {/* Linha 1: nome + badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm leading-tight">{c.nome}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badgeStyles[style])}>
                      {badgeLabels[style]}
                    </span>
                  </div>

                  {/* Botão de pagamento */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    onClick={() => setConfirmando(c)}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {c.parcelada ? "Pagar parcela" : "Marcar como pago"}
                  </Button>
                </div>

                {/* Grid de campos */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  <Field label="Cartão / Pessoa" value={c.cartaoOuPessoa} />
                  <Field
                    label="Parcelas restantes"
                    value={c.parcelada ? `${restantes} / ${c.totalParcelas}` : "—"}
                    highlight={style === "last" || style === "few"}
                  />
                  <Field label="Data de início" value={formatDate(c.dataInicio)} />
                  <Field
                    label="Valor da parcela"
                    value={c.parcelada ? formatCurrency(c.valorParcela) : "—"}
                  />
                  <Field label="Valor total" value={formatCurrency(c.valorTotal)} bold />
                  <Field label="Parcelada" value={c.parcelada ? "Sim" : "Não"} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialog de confirmação */}
      <Dialog open={!!confirmando} onOpenChange={(o) => !o && setConfirmando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmando?.parcelada ? "Confirmar pagamento" : "Marcar como pago"}
            </DialogTitle>
            <DialogDescription>
              {confirmando?.parcelada
                ? "Você realmente pagou essa parcela? Essa ação não pode ser desfeita."
                : `Confirmar que a compra "${confirmando?.nome}" foi paga? Ela será removida da listagem.`}
            </DialogDescription>
          </DialogHeader>
          {confirmando && (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="font-medium">{confirmando.nome}</p>
              <p className="text-muted-foreground">
                {confirmando.parcelada
                  ? `Parcela: ${formatCurrency(confirmando.valorParcela)} — restam ${getRestantes(confirmando) - 1} após este pagamento`
                  : `Valor: ${formatCurrency(confirmando.valorTotal)}`}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmando(null)} disabled={pagar.isPending}>
              Cancelar
            </Button>
            <Button onClick={handlePagar} disabled={pagar.isPending}>
              {pagar.isPending ? "Processando…" : "Sim, paguei"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <p className={cn(
        "font-medium",
        bold && "font-semibold text-foreground",
        highlight && "text-primary",
      )}>
        {value}
      </p>
    </div>
  );
}
