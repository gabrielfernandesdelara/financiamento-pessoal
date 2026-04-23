"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatCurrency } from "@/lib/utils";
import type { CashFlowMonth } from "@/lib/analytics";

type Point = {
  label: string;
  closingBalance: number;
};

export function CashFlowChart({
  months,
  startingBalance,
}: {
  months: CashFlowMonth[];
  startingBalance: number;
}) {
  const data: Point[] = [
    { label: "Início", closingBalance: Number(startingBalance.toFixed(2)) },
    ...months.map((m) => ({
      label: m.label.split(" de ")[0],
      closingBalance: m.closingBalance,
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="cashflow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(217 89% 53%)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(217 89% 53%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={60}
          tickFormatter={(v) => formatCompact(v as number)}
        />
        <ReferenceLine y={0} stroke="hsl(220 13% 80%)" strokeDasharray="3 3" />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(label) => `Fim de ${label}`}
          contentStyle={{ borderRadius: 12 }}
        />
        <Area
          type="monotone"
          dataKey="closingBalance"
          name="Saldo projetado"
          stroke="hsl(217 89% 53%)"
          strokeWidth={2.5}
          fill="url(#cashflow)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
