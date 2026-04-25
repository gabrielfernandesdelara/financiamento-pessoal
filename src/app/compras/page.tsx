"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  ShoppingBag, CheckCircle, CreditCard, Wallet, TrendingUp, TrendingDown,
  BadgeDollarSign, Repeat2, Users, Filter, Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { useCompras, usePagarCompra, usePagarTudo } from "@/hooks/use-compras";
import { useProfile } from "@/hooks/use-profile";
import { useBonuses } from "@/hooks/use-bonuses";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Compra } from "@/types/compra";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRestantes(c: Compra): number {
  return c.parcelasRestantes ?? 0;
}

type CardStyle = "many" | "few" | "last" | "avista" | "recorrente";

function getCardStyle(c: Compra): CardStyle {
  if (c.semDataTermino) return "recorrente";
  if (!c.parcelada) return "avista";
  const r = getRestantes(c);
  if (r <= 2) return "last";
  if (r <= 5) return "few";
  return "many";
}

const cardStyles: Record<CardStyle, string> = {
  many:       "border-l-4 border-l-primary bg-gradient-to-r from-primary/15 to-transparent",
  few:        "border-l-4 border-l-purple-400 bg-gradient-to-r from-purple-400/10 to-transparent",
  last:       "border-l-4 border-l-accent-foreground bg-gradient-to-r from-accent/60 to-transparent",
  avista:     "border-l-4 border-l-primary/40 bg-primary/5",
  recorrente: "border-l-4 border-l-success/60 bg-success/5",
};

const badgeStyles: Record<CardStyle, string> = {
  many:       "bg-primary/20 text-primary",
  few:        "bg-purple-400/20 text-purple-400",
  last:       "bg-accent text-accent-foreground",
  avista:     "bg-primary/10 text-primary",
  recorrente: "bg-success/15 text-success",
};

const badgeLabels: Record<CardStyle, string> = {
  many:       "Parcelada",
  few:        "Parcelada",
  last:       "Quase lá!",
  avista:     "À vista",
  recorrente: "Recorrente",
};

// ── Seção: Resumo Financeiro ──────────────────────────────────────────────────

function ResumoFinanceiro({ compras }: { compras: Compra[] }) {
  const { data: profile } = useProfile();
  const { data: bonuses } = useBonuses();

  const totalDoMes = compras.reduce((sum, c) => {
    if (c.semDataTermino) return sum + c.valorTotal;
    if (c.parcelada) return getRestantes(c) > 0 ? sum + c.valorParcela : sum;
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
        <MetricTile icon={CreditCard} label="Valor total do Mês" value={formatCurrency(totalDoMes)} tone="expense" />
        <MetricTile icon={ShoppingBag} label="Valor Total" value={formatCurrency(valorTotalGeral)} />
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
  icon: Icon, label, value, tone,
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
  const pagar     = usePagarCompra();
  const pagarTudo = usePagarTudo();

  const [confirmando, setConfirmando] = React.useState<Compra | null>(null);
  const [confirmandoTudo, setConfirmandoTudo] = React.useState(false);
  const [filtro, setFiltro] = React.useState<string>("");

  const compras = data ?? [];

  const cartoes = React.useMemo(() => {
    const set = new Set(compras.map((c) => c.cartaoOuPessoa));
    return Array.from(set).sort();
  }, [compras]);

  const comprasFiltradas = filtro
    ? compras.filter((c) => c.cartaoOuPessoa === filtro)
    : compras;

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

  async function handlePagarTudo() {
    try {
      const resultado = await pagarTudo.mutateAsync(filtro || undefined);
      toast({
        title: `${resultado.processadas} compra(s) processada(s)!`,
        description: filtro
          ? `Pagamentos de "${filtro}" registrados.`
          : "Todas as compras do mês foram processadas.",
        variant: "success",
      });
      setConfirmandoTudo(false);
      setFiltro("");
    } catch (err) {
      toast({
        title: "Erro ao processar pagamentos",
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

  const comprasElegiveis = comprasFiltradas.filter((c) => !c.semDataTermino);

  return (
    <>
      <QuintoDiaPopup />
      <PageHeader title="Compras" description="Suas compras ativas e parcelas em andamento." />

      {!isLoading && <ResumoFinanceiro compras={compras} />}

      {/* Barra de controles: filtro + pagar tudo */}
      {!isLoading && compras.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Filtro por cartão/pessoa */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="">Todos os cartões/pessoas</option>
              {cartoes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {filtro && (
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                onClick={() => setFiltro("")}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>

          {/* Pagar tudo */}
          {comprasElegiveis.length > 0 && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 shrink-0"
              onClick={() => setConfirmandoTudo(true)}
            >
              <CheckCircle className="h-4 w-4" />
              Pagar Tudo{filtro ? ` (${filtro})` : ""}
            </Button>
          )}
        </div>
      )}

      {/* Lista de compras */}
      <div className="space-y-2">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
        ) : comprasFiltradas.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={filtro ? `Nenhuma compra para "${filtro}"` : "Nenhuma compra ativa"}
            description={filtro ? "Tente outro filtro ou remova o filtro atual." : "Adicione uma compra na aba Adicionar."}
          />
        ) : (
          comprasFiltradas.map((c) => {
            const restantes = getRestantes(c);
            const style = getCardStyle(c);

            return (
              <div
                key={c.id}
                className={cn("rounded-xl border px-3 py-2.5 transition-opacity", cardStyles[style])}
              >
                {/* Linha 1: nome + badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm leading-tight">{c.nome}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badgeStyles[style])}>
                      {badgeLabels[style]}
                    </span>
                    {c.dividida && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-400/15 px-2 py-0.5 text-xs font-semibold text-blue-500">
                        <Users className="h-3 w-3" />
                        Dividida
                      </span>
                    )}
                    {c.semDataTermino && (
                      <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                        <Repeat2 className="h-3 w-3" />
                        Recorrente
                      </span>
                    )}
                    {c.adicionadoPor && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {c.adicionadoPor} adicionou
                      </span>
                    )}
                  </div>

                  {/* Botão de pagamento — oculto para recorrentes */}
                  {!c.semDataTermino && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => setConfirmando(c)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {c.parcelada ? "Pagar parcela" : "Marcar como pago"}
                    </Button>
                  )}
                </div>

                {/* Info dividida */}
                {c.dividida && c.divididoCom && c.divididoCom.length > 0 && (
                  <p className="mb-1.5 flex items-center gap-1 text-xs text-blue-500">
                    <Users className="h-3 w-3 shrink-0" />
                    Dividida com: {c.divididoCom.join(", ")}
                  </p>
                )}

                {/* Grid de campos */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  <Field label="Cartão / Pessoa" value={c.cartaoOuPessoa} />
                  <Field
                    label="Parcelas restantes"
                    value={c.semDataTermino ? "Recorrente" : c.parcelada ? `${restantes} / ${c.totalParcelas}` : "—"}
                    highlight={style === "last" || style === "few"}
                  />
                  <Field label="Data de início" value={formatDate(c.dataInicio)} />
                  <Field
                    label="Valor da parcela"
                    value={!c.semDataTermino && c.parcelada ? formatCurrency(c.valorParcela) : "—"}
                  />
                  <Field label="Valor total" value={formatCurrency(c.valorTotal)} bold />
                  <Field label="Categoria" value={c.categoria} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialog: pagar parcela individual */}
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

      {/* Dialog: pagar tudo */}
      <Dialog open={confirmandoTudo} onOpenChange={(o) => !o && setConfirmandoTudo(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagar Tudo{filtro ? ` — ${filtro}` : ""}</DialogTitle>
            <DialogDescription>
              {filtro
                ? `Deseja pagar todas as compras à vista e as parcelas do mês atual para o cartão/pessoa "${filtro}"? Essa ação não pode ser desfeita.`
                : "Deseja pagar todas as compras à vista e as parcelas do mês atual? Essa ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">
              • Compras à vista → marcadas como pagas e removidas<br />
              • Parceladas → parcela decrementada em 1 (removidas se chegarem a 0)<br />
              • Compras recorrentes → <strong>não são afetadas</strong>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmandoTudo(false)} disabled={pagarTudo.isPending}>
              Cancelar
            </Button>
            <Button onClick={handlePagarTudo} disabled={pagarTudo.isPending}>
              {pagarTudo.isPending ? "Processando…" : "Sim, pagar tudo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label, value, bold, highlight,
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
