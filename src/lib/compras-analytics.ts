import { parseISO } from "date-fns";
import type { Compra } from "@/types/compra";
import type { Cobranca } from "@/types/cobranca";
import type { Bonus } from "@/types/bonus";
import type { Previsao } from "@/types/previsao";

export type CategoriaStats = {
  categoria: string;
  total: number;
  count: number;
};

export type MonthProjection = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

export function totalAtivo(compras: Compra[]): number {
  return compras
    .filter(c => !c.quitada)
    .reduce((s, c) => s + c.valorTotal, 0);
}

export function parcelasDoMes(compras: Compra[], year: number, month: number): number {
  return compras
    .filter(c => !c.quitada)
    .reduce((sum, c) => {
      if (c.parcelada && (c.parcelasRestantes ?? 0) > 0) return sum + c.valorParcela;
      if (!c.parcelada) {
        const d = parseISO(c.dataInicio);
        if (d.getFullYear() === year && d.getMonth() === month) return sum + c.valorTotal;
      }
      return sum;
    }, 0);
}

export function projecaoMensal(
  compras: Compra[],
  salario: number,
  totalBonuses: number,
  meses = 6,
): MonthProjection[] {
  const now = new Date();
  return Array.from({ length: meses }, (_, i) => {
    const y = now.getFullYear();
    const m = now.getMonth() + i;
    const adjustedY = y + Math.floor(m / 12);
    const adjustedM = m % 12;
    const income = salario + (i === 0 ? totalBonuses : 0);
    const expense = parcelasDoMes(compras, adjustedY, adjustedM);
    return {
      month: `${MESES_PT[adjustedM]}/${String(adjustedY).slice(2)}`,
      income,
      expense,
      balance: income - expense,
    };
  });
}

export function totalReceitas(salario: number, bonuses: Bonus[]): number {
  return salario + bonuses.reduce((s, b) => s + b.valor, 0);
}

export function sobrouNoMes(compras: Compra[], salario: number, bonuses: Bonus[]): number {
  const now = new Date();
  const gasto = parcelasDoMes(compras, now.getFullYear(), now.getMonth());
  return totalReceitas(salario, bonuses) - gasto;
}

export function totalCobrancas(cobrancas: Cobranca[]): number {
  return cobrancas.reduce((s, c) => s + c.valorDevido, 0);
}

export function comprasPorCategoria(compras: Compra[]): { category: string; total: number }[] {
  return totalPorCategoria(compras).map(c => ({ category: c.categoria, total: c.total }));
}

export function saldoEstimado(compras: Compra[], saldoAtual: number): number {
  const now = new Date();
  const gasto = parcelasDoMes(compras, now.getFullYear(), now.getMonth());
  return saldoAtual - gasto;
}

export function projecaoComPrevisoes(
  previsoes: Previsao[],
  saldoAtual: number,
  salario: number,
  meses = 6,
): MonthProjection[] {
  const now = new Date();
  let balance = saldoAtual;
  return Array.from({ length: meses }, (_, i) => {
    const y = now.getFullYear();
    const m = now.getMonth() + i;
    const adjY = y + Math.floor(m / 12);
    const adjM = m % 12;
    const monthStart = new Date(adjY, adjM, 1);
    const monthEnd = new Date(adjY, adjM + 1, 0);
    const expense = previsoes
      .filter(p => {
        const d = parseISO(p.dataPrevista);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, p) => s + p.valor, 0);
    const income = salario;
    balance = balance + income - expense;
    return {
      month: `${MESES_PT[adjM]}/${String(adjY).slice(2)}`,
      income,
      expense,
      balance,
    };
  });
}
