"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { CategoryBreakdown } from "@/lib/analytics";

const COLORS = [
  "hsl(217 89% 53%)",
  "hsl(142 70% 45%)",
  "hsl(35 92% 55%)",
  "hsl(280 70% 60%)",
  "hsl(0 72% 60%)",
  "hsl(190 80% 45%)",
  "hsl(45 90% 50%)",
  "hsl(320 65% 55%)",
];

export function CategoryPie({ data }: { data: CategoryBreakdown[] }) {
  if (!data.length) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Nenhuma despesa registrada
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => formatCurrency(v)}
          contentStyle={{ borderRadius: 12 }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
