import type { Transaction } from "@/types/transaction";
import { LOCALE, monthKey, todayISO } from "./utils";

export type Totals = {
  income: number;
  expense: number;
  balance: number;
};

export function totalsFor(transactions: Transaction[]): Totals {
  return transactions.reduce<Totals>(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else acc.expense += t.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, balance: 0 },
  );
}

export function filterByMonth(
  transactions: Transaction[],
  month: string, // YYYY-MM
): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === month);
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function previousMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

export type CategoryBreakdown = {
  category: string;
  total: number;
};

export function expensesByCategory(
  transactions: Transaction[],
): CategoryBreakdown[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export type MonthlyPoint = {
  month: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
};

export function monthlyTimeline(
  transactions: Transaction[],
  count = 6,
): MonthlyPoint[] {
  const points: MonthlyPoint[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const month = filterByMonth(transactions, key);
    const totals = totalsFor(month);
    const label = d.toLocaleDateString(LOCALE, { month: "short" });
    // pt-BR returns "abr." — strip the trailing dot and capitalize for nicer axis labels.
    const cleanLabel =
      label.replace(/\.$/, "").charAt(0).toUpperCase() +
      label.replace(/\.$/, "").slice(1);
    points.push({
      month: key,
      label: cleanLabel,
      income: Number(totals.income.toFixed(2)),
      expense: Number(totals.expense.toFixed(2)),
      balance: Number(totals.balance.toFixed(2)),
    });
  }
  return points;
}

export function balanceEvolution(
  transactions: Transaction[],
): { date: string; balance: number }[] {
  const sorted = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  let running = 0;
  const map = new Map<string, number>();
  for (const t of sorted) {
    running += t.type === "income" ? t.amount : -t.amount;
    map.set(t.date, running);
  }
  return Array.from(map.entries()).map(([date, balance]) => ({
    date,
    balance: Number(balance.toFixed(2)),
  }));
}

export function uniqueCategories(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map((t) => t.category)))
    .filter(Boolean)
    .sort();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return capitalize(
    d.toLocaleDateString(LOCALE, { month: "long", year: "numeric" }),
  );
}

export type MonthOption = { key: string; label: string };

/**
 * Distinct months that appear in the transactions list, sorted desc.
 * Used to populate the month filter dropdown.
 */
export function availableMonths(transactions: Transaction[]): MonthOption[] {
  const set = new Set<string>();
  for (const t of transactions) set.add(monthKey(t.date));
  return Array.from(set)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [y, m] = key.split("-").map(Number);
      return { key, label: monthLabel(y, m) };
    });
}

/**
 * Split realized vs planned (future-dated) transactions based on today.
 */
export function splitByDate(transactions: Transaction[]): {
  realized: Transaction[];
  planned: Transaction[];
} {
  const today = todayISO();
  const realized: Transaction[] = [];
  const planned: Transaction[] = [];
  for (const t of transactions) {
    if (t.date > today) planned.push(t);
    else realized.push(t);
  }
  return { realized, planned };
}

export type CashFlowMonth = {
  month: string; // YYYY-MM
  label: string;
  openingBalance: number;
  income: number;
  expense: number;
  net: number;
  closingBalance: number;
  isCurrent: boolean;
  hasPlanned: boolean;
};

export type CashFlowProjection = {
  currentBalance: number;
  startingBalance: number;
  endingBalance: number;
  months: CashFlowMonth[];
};

/**
 * Project month-by-month cash flow from the current month through `until`
 * (defaults to December of the current year).
 *
 * - Starting balance = sum of all transactions BEFORE the current month
 * - Each month rolls opening → closing using both realized and planned entries
 * - "currentBalance" reflects realized-only money as of today
 */
export function cashFlowProjection(
  transactions: Transaction[],
  options: { until?: string } = {},
): CashFlowProjection {
  const today = todayISO();
  const now = new Date();
  const currentMonthKey = monthKey(now);
  const untilMonth =
    options.until ?? `${now.getFullYear()}-12`;

  const startingBalance = transactions
    .filter((t) => monthKey(t.date) < currentMonthKey)
    .reduce(
      (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
      0,
    );

  const currentBalance = transactions
    .filter((t) => t.date <= today)
    .reduce(
      (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
      0,
    );

  const months: CashFlowMonth[] = [];
  let opening = startingBalance;
  let [year, month] = currentMonthKey.split("-").map(Number);
  const [endYear, endMonth] = untilMonth.split("-").map(Number);

  // Hard ceiling to avoid runaway loops if `until` is malformed.
  for (let guard = 0; guard < 60; guard++) {
    if (year > endYear || (year === endYear && month > endMonth)) break;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const monthTxs = transactions.filter((t) => monthKey(t.date) === key);
    const income = monthTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const net = income - expense;
    const closing = opening + net;
    months.push({
      month: key,
      label: monthLabel(year, month),
      openingBalance: Number(opening.toFixed(2)),
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      net: Number(net.toFixed(2)),
      closingBalance: Number(closing.toFixed(2)),
      isCurrent: key === currentMonthKey,
      hasPlanned: monthTxs.some((t) => t.date > today),
    });
    opening = closing;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return {
    currentBalance: Number(currentBalance.toFixed(2)),
    startingBalance: Number(startingBalance.toFixed(2)),
    endingBalance: months.length
      ? months[months.length - 1].closingBalance
      : Number(currentBalance.toFixed(2)),
    months,
  };
}
