"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { LucroGastosPoint } from "@/lib/compras-analytics";

export function LucroGastosChart({ data }: { data: LucroGastosPoint[] }) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10 }}
          stroke="hsl(var(--muted-foreground))"
          width={48}
        />
        <Tooltip
          formatter={(v: number, name: string) => [
            formatCurrency(v),
            name === "receita" ? "Receita" : name === "gastos" ? "Gastos" : "Lucro",
          ]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend
          formatter={(v) => v === "receita" ? "Receita" : v === "gastos" ? "Gastos" : "Lucro"}
          wrapperStyle={{ fontSize: 12 }}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="receita"
          stroke="hsl(var(--success))"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="gastos"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="lucro"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
