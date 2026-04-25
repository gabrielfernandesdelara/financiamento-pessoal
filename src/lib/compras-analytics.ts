import { parseISO } from "date-fns";
import type { Compra } from "@/types/compra";
import type { Cobranca } from "@/types/cobranca";
import type { Bonus } from "@/types/bonus";
import type { Previsao } from "@/types/previsao";

export type CategoriaStats = { categoria: string; total: number; count: number };

export type MonthProjection = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export type LucroGastosPoint = {
  month: string;
  receita: number;
  gastos: number;
  lucro: number;
};

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthLabel(year: number, month: number) {
  return `${MESES_PT[month]}/${String(year).slice(2)}`;
}

// ─── Categorias ───────────────────────────────────────────────────────────────

export function totalPorCategoria(compras: Compra[]): CategoriaStats[] {
  const map = new Map<string, CategoriaStats>();
  for (const c of compras) {
    const cat = c.categoria || "Outros";
    const s = map.get(cat) ?? { categoria: cat, total: 0, count: 0 };
    s.total += c.valorTotal;
    s.count += 1;
    map.set(cat, s);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function comprasPorCategoria(compras: Compra[]): { category: string; total: number }[] {
  return totalPorCategoria(compras).map(c => ({ category: c.categoria, total: c.total }));
}

// ─── Cálculos mensais ─────────────────────────────────────────────────────────

// Usado para o mês ATUAL (sem simulação temporal).
export function parcelasDoMes(compras: Compra[], year: number, month: number): number {
  return compras
    .filter(c => !c.quitada)
    .reduce((sum, c) => {
      if (c.semDataTermino) return sum + c.valorTotal;
      if (c.parcelada && (c.parcelasRestantes ?? 0) > 0) return sum + c.valorParcela;
      if (!c.parcelada) {
        const d = parseISO(c.dataInicio);
        if (d.getFullYear() === year && d.getMonth() === month) return sum + c.valorTotal;
      }
      return sum;
    }, 0);
}

// Projeção real de gastos N meses à frente (0 = mês atual).
// Parceladas diminuem conforme parcelas acabam; à vista só aparecem no mês certo.
function gastosProjetados(compras: Compra[], monthsAhead: number, year: number, month: number): number {
  return compras
    .filter(c => !c.quitada)
    .reduce((sum, c) => {
      if (c.semDataTermino) {
        // Recorrente: sempre presente
        return sum + c.valorTotal;
      }
      if (c.parcelada) {
        // Quantas parcelas restarão neste mês futuro?
        const restantes = (c.parcelasRestantes ?? c.totalParcelas ?? 0) - monthsAhead;
        if (restantes > 0) return sum + c.valorParcela;
        return sum;
      }
      // À vista: só aparece no mês de início
      const d = parseISO(c.dataInicio);
      if (d.getFullYear() === year && d.getMonth() === month) return sum + c.valorTotal;
      return sum;
    }, 0);
}

export function totalAtivo(compras: Compra[]): number {
  return compras.filter(c => !c.quitada).reduce((s, c) => s + c.valorTotal, 0);
}

export function totalCobrancas(cobrancas: Cobranca[]): number {
  return cobrancas.reduce((s, c) => s + c.valorDevido, 0);
}

export function saldoEstimado(compras: Compra[], saldoAtual: number): number {
  const now = new Date();
  return saldoAtual - parcelasDoMes(compras, now.getFullYear(), now.getMonth());
}

export function receitaMensal(salario: number, bonuses: Bonus[]): number {
  return salario + bonuses.filter(b => b.recorrente).reduce((s, b) => s + b.valor, 0);
}

export function totalReceitas(salario: number, bonuses: Bonus[]): number {
  return salario + bonuses.reduce((s, b) => s + b.valor, 0);
}

export function sobrouNoMes(compras: Compra[], salario: number, bonuses: Bonus[]): number {
  const now = new Date();
  return totalReceitas(salario, bonuses) - parcelasDoMes(compras, now.getFullYear(), now.getMonth());
}

// ─── Projeção futura (Painel) — receita acumulada ────────────────────────────
// income[mes] = running_anterior + salario + bonusRecorrentes
// balance[mes] = income[mes] - expense[mes]
// running = balance[mes]

export function projecaoMensal(
  compras: Compra[],
  salario: number,
  bonuses: Bonus[],
  meses = 6,
  saldoRestante = 0,
): MonthProjection[] {
  const now = new Date();
  const bonusRecorrentes = bonuses.filter(b => b.recorrente).reduce((s, b) => s + b.valor, 0);
  const receitaMes = salario + bonusRecorrentes;
  let running = saldoRestante;

  return Array.from({ length: meses }, (_, i) => {
    const raw = now.getMonth() + i;
    const adjY = now.getFullYear() + Math.floor(raw / 12);
    const adjM = raw % 12;
    const expense = gastosProjetados(compras, i, adjY, adjM);
    const income = running + receitaMes;
    const balance = income - expense;
    running = balance;
    return { month: monthLabel(adjY, adjM), income, expense, balance };
  });
}

// ─── Projeção com previsões (aba Previsões — simulação) — acumulada ───────────

export function projecaoComPrevisoes(
  previsoes: Previsao[],
  compras: Compra[],
  bonuses: Bonus[],
  saldoAtual: number,
  salario: number,
  meses = 6,
): MonthProjection[] {
  const now = new Date();
  const bonusRecorrentes = bonuses.filter(b => b.recorrente).reduce((s, b) => s + b.valor, 0);
  const receitaMes = salario + bonusRecorrentes;
  let running = saldoAtual;

  return Array.from({ length: meses }, (_, i) => {
    const raw = now.getMonth() + i;
    const adjY = now.getFullYear() + Math.floor(raw / 12);
    const adjM = raw % 12;
    const monthStart = new Date(adjY, adjM, 1);
    const monthEnd   = new Date(adjY, adjM + 1, 0);

    // Gastos reais (mesma lógica do Painel — parcelas diminuem ao longo do tempo)
    const comprasDoMes = gastosProjetados(compras, i, adjY, adjM);

    // Previsões simuladas: pontuais (só no mês da data) ou recorrentes (a partir da data)
    const previstasDoMes = previsoes.reduce((s, p) => {
      const d = parseISO(p.dataPrevista);
      const inicioMes = new Date(d.getFullYear(), d.getMonth(), 1);
      if (p.recorrente) {
        return monthStart >= inicioMes ? s + p.valor : s;
      }
      return d >= monthStart && d <= monthEnd ? s + p.valor : s;
    }, 0);

    const expense = comprasDoMes + previstasDoMes;
    const income = running + receitaMes;
    const balance = income - expense;
    running = balance;
    return { month: monthLabel(adjY, adjM), income, expense, balance };
  });
}

// ─── Histórico: Lucro vs Gastos (últimos N meses) ─────────────────────────────
// Receita = salário + saldo_restante + todos os bônus (valor fixo por mês)
// Gastos  = compras à vista do mês + valor_parcela das parceladas ativas no mês
//           + valor_total das compras recorrentes (sem data de término)
// Lucro   = Receita − Gastos

export function lucroVsGastosHistorico(
  compras: Compra[],
  _cobrancas: Cobranca[],
  bonuses: Bonus[],
  salario: number,
  saldoRestante: number,
  meses = 6,
): LucroGastosPoint[] {
  const now = new Date();
  const totalBonuses = bonuses.reduce((s, b) => s + b.valor, 0);
  // Renda mensal bruta (sem saldoRestante — será somado por mês)
  const receitaMes = salario + totalBonuses;

  return Array.from({ length: meses }, (_, i) => {
    const raw = now.getMonth() - (meses - 1 - i);
    const adjM = ((raw % 12) + 12) % 12;
    const adjY = now.getFullYear() + Math.floor(raw / 12);
    const mesAtual = new Date(adjY, adjM, 1);

    const gastos = compras.reduce((sum, c) => {
      const inicio = parseISO(c.dataInicio);
      const inicioMes = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

      if (c.semDataTermino) {
        if (mesAtual >= inicioMes) return sum + c.valorTotal;
      } else if (!c.parcelada) {
        if (inicio.getFullYear() === adjY && inicio.getMonth() === adjM) {
          return sum + c.valorTotal;
        }
      } else if (c.parcelada && c.totalParcelas && c.valorParcela > 0) {
        const fimMes = new Date(
          inicio.getFullYear(),
          inicio.getMonth() + c.totalParcelas,
          1,
        );
        if (mesAtual >= inicioMes && mesAtual < fimMes) {
          return sum + c.valorParcela;
        }
      }
      return sum;
    }, 0);

    // Sobrou no Mês = Salário + Bônus − Gastos do mês
    const sobrouNoMes = receitaMes - gastos;
    // Receita = Saldo Restante + Sobrou no Mês
    const receitaFinal = saldoRestante + sobrouNoMes;

    return { month: monthLabel(adjY, adjM), receita: receitaFinal, gastos, lucro: sobrouNoMes };
  });
}
