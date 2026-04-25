"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Wallet, ShoppingBag, Bell, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/dashboard/chart-card";
import { CategoryPie } from "@/components/dashboard/category-pie";
import { LucroGastosChart } from "@/components/dashboard/lucro-gastos-chart";
import { useCompras } from "@/hooks/use-compras";
import { useCobrancas } from "@/hooks/use-cobrancas";
import { useProfile } from "@/hooks/use-profile";
import { useBonuses } from "@/hooks/use-bonuses";
import {
  projecaoMensal,
  totalCobrancas,
  comprasPorCategoria,
  saldoEstimado,
  receitaMensal,
  lucroVsGastosHistorico,
} from "@/lib/compras-analytics";
import { cn, formatCurrency } from "@/lib/utils";

export default function PainelPage() {
  const { status } = useSession();
  const { data: comprasData, isLoading } = useCompras();
  const { data: cobrancasData } = useCobrancas();
  const { data: profile } = useProfile();
  const { data: bonusesData } = useBonuses();

  const compras   = comprasData   ?? [];
  const cobrancas = cobrancasData ?? [];
  const bonuses   = bonusesData   ?? [];

  const salario       = profile?.salario ?? 0;
  const saldoRestante = profile?.saldoRestante ?? 0;

  // Painel usa apenas bônus recorrentes na receita mensal
  const receita    = receitaMensal(salario, bonuses);
  const estimado   = saldoEstimado(compras, saldoRestante);
  const aReceber   = totalCobrancas(cobrancas);

  const projecao = React.useMemo(
    () => projecaoMensal(compras, salario, bonuses, 6, saldoRestante),
    [compras, salario, bonuses, saldoRestante],
  );

  const pieData = React.useMemo(() => comprasPorCategoria(compras), [compras]);

  const historico = React.useMemo(
    () => lucroVsGastosHistorico(compras, cobrancas, bonuses, salario, saldoRestante, 6),
    [compras, cobrancas, bonuses, salario, saldoRestante],
  );

  if (status === "loading") return <Skeleton className="h-64" />;
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader title="Painel" description="Resumo financeiro e projeção baseada nas suas compras." />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile icon={Wallet} label="Saldo restante" value={formatCurrency(saldoRestante)}
              tone={saldoRestante >= 0 ? "income" : "expense"} />
            <Tile icon={estimado >= 0 ? TrendingUp : TrendingDown} label="Saldo estimado"
              value={formatCurrency(estimado)} tone={estimado >= 0 ? "income" : "expense"}
              hint="Saldo restante − parcelas deste mês" />
            <Tile icon={ShoppingBag} label="Receita mensal" value={formatCurrency(receita)} tone="income"
              hint="Salário + bônus recorrentes" />
            <Tile icon={Bell} label="A receber" value={formatCurrency(aReceber)} tone="income" />
          </div>

          {/* Gráfico: Lucro vs Gastos (últimos 6 meses) */}
          <ChartCard
            title="Gráfico - últimos 6 meses"
            description="Gráfico de histórico de Receita, Gastos e saldo dos ultimos 6 meses."
          >
            <LucroGastosChart data={historico} />
          </ChartCard>

          {/* Projeção futura */}
          <ChartCard
            title="Projeção — próximos 6 meses"
            description="Receita vs parcelas das compras ativas."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 text-left">Mês</th>
                    <th className="py-2 text-right">Receita</th>
                    <th className="py-2 text-right">Gastos</th>
                    <th className="py-2 text-right font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {projecao.map((p) => (
                    <tr key={p.month} className="border-b border-border/50">
                      <td className="py-2 font-medium">{p.month}</td>
                      <td className="py-2 text-right text-success">{formatCurrency(p.income)}</td>
                      <td className="py-2 text-right text-destructive">{formatCurrency(p.expense)}</td>
                      <td className={cn("py-2 text-right font-semibold",
                        p.balance >= 0 ? "text-success" : "text-destructive")}>
                        {formatCurrency(p.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* Categorias */}
          {pieData.length > 0 && (
            <ChartCard title="Gastos por categoria" description="Distribuição do valor total das compras ativas.">
              <CategoryPie data={pieData} />
            </ChartCard>
          )}
        </div>
      )}
    </>
  );
}

function Tile({
  icon: Icon, label, value, tone, hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "income" | "expense";
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn(
          "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          tone === "income"  ? "bg-success/10 text-success"
            : tone === "expense" ? "bg-destructive/10 text-destructive"
            : "bg-accent text-accent-foreground",
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-0.5 text-base font-semibold tracking-tight",
            tone === "income" && "text-success",
            tone === "expense" && "text-destructive")}>
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
