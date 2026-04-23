import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "neutral" | "income" | "expense";
  delta?: number;
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  delta,
}: Props) {
  const positive = (delta ?? 0) >= 0;
  const showDelta = typeof delta === "number" && Number.isFinite(delta);

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tracking-tight md:text-3xl",
              tone === "income" && "text-success",
              tone === "expense" && "text-destructive",
            )}
          >
            {formatCurrency(value)}
          </p>
          {showDelta && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                positive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta!).toFixed(1).replace(".", ",")}% vs mês anterior
            </div>
          )}
        </div>
        <span
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
            tone === "income" && "bg-success/10 text-success",
            tone === "expense" && "bg-destructive/10 text-destructive",
            tone === "neutral" && "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
