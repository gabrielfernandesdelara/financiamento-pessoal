"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDrop } from "@/components/import/file-drop";
import { PreviewTable } from "@/components/import/preview-table";
import { parseCsv, type ParseResult } from "@/lib/csv/parser";
import { cn, formatCurrency } from "@/lib/utils";
import { useTransactions } from "@/hooks/use-transactions";
import { transactionsClient } from "@/services/transactions-client";
import { toast } from "@/hooks/use-toast";

export default function ImportPage() {
  const { status } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: existingTransactions } = useTransactions();

  const [fileName, setFileName] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ParseResult | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  const duplicates = React.useMemo(() => {
    const set = new Set<string>();
    if (!existingTransactions || !result) return set;
    const existingIds = new Set(existingTransactions.map((t) => t.id));
    for (const row of result.rows) {
      if (existingIds.has(row.id)) set.add(row.id);
    }
    return set;
  }, [existingTransactions, result]);

  function handleFile(file: File, content: string) {
    const parsed = parseCsv(content);
    setFileName(file.name);
    setResult(parsed);
    // Pre-select all non-duplicate rows.
    const existingIds = new Set(
      (existingTransactions ?? []).map((t) => t.id),
    );
    setSelected(
      new Set(
        parsed.rows
          .filter((r) => !existingIds.has(r.id))
          .map((r) => r.id),
      ),
    );
  }

  function reset() {
    setFileName(null);
    setResult(null);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!result) return;
    setSelected(checked ? new Set(result.rows.map((r) => r.id)) : new Set());
  }

  async function commit() {
    if (!result) return;
    const toImport = result.rows
      .filter((r) => selected.has(r.id))
      .map((r) => ({
        id: r.id,
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.type,
        category: r.category,
        recurring: r.recurring,
      }));
    if (toImport.length === 0) {
      toast({
        title: "Nenhuma transação selecionada",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await transactionsClient.bulk(toImport);
      await qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: `${res.inserted} transações importadas`,
        description:
          res.skipped > 0
            ? `${res.skipped} já existiam e foram ignoradas.`
            : undefined,
        variant: "success",
      });
      router.push("/transactions");
    } catch (err) {
      toast({
        title: "Falha ao importar",
        description:
          err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return null;
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader
        title="Importar transações"
        description="Envie um extrato CSV do seu banco. Por enquanto, oferecemos suporte ao Nubank."
      />

      {!result ? (
        <FileDrop onFile={handleFile} />
      ) : (
        <ImportReview
          fileName={fileName}
          result={result}
          selected={selected}
          duplicates={duplicates}
          submitting={submitting}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onReset={reset}
          onCommit={commit}
        />
      )}
    </>
  );
}

function ImportReview({
  fileName,
  result,
  selected,
  duplicates,
  submitting,
  onToggle,
  onToggleAll,
  onReset,
  onCommit,
}: {
  fileName: string | null;
  result: ParseResult;
  selected: Set<string>;
  duplicates: Set<string>;
  submitting: boolean;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onReset: () => void;
  onCommit: () => void;
}) {
  const selectedRows = result.rows.filter((r) => selected.has(r.id));
  const totalIncome = selectedRows
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount, 0);
  const totalExpense = selectedRows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {fileName ?? "extrato.csv"}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.rows.length} transações encontradas ·{" "}
                {duplicates.size} já existem
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onReset} disabled={submitting}>
            <RefreshCw className="h-4 w-4" />
            Trocar arquivo
          </Button>
        </CardContent>
      </Card>

      {result.errors.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {result.errors.length}{" "}
                  {result.errors.length === 1 ? "linha ignorada" : "linhas ignoradas"}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-destructive/80">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>
                      Linha {e.line}: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>… e mais {result.errors.length - 5}</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile
          label="Selecionadas"
          value={`${selected.size} de ${result.rows.length}`}
        />
        <SummaryTile
          label="Receitas"
          value={formatCurrency(totalIncome)}
          tone="income"
        />
        <SummaryTile
          label="Despesas"
          value={formatCurrency(totalExpense)}
          tone="expense"
        />
      </div>

      <PreviewTable
        rows={result.rows}
        duplicates={duplicates}
        selected={selected}
        onToggle={onToggle}
        onToggleAll={onToggleAll}
      />

      <div className="sticky bottom-20 z-30 flex justify-end md:bottom-4">
        <Button size="lg" onClick={onCommit} disabled={submitting}>
          {submitting
            ? "Importando…"
            : `Importar ${selected.size} ${
                selected.size === 1 ? "transação" : "transações"
              }`}
        </Button>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-xl font-semibold tracking-tight",
            tone === "income" && "text-success",
            tone === "expense" && "text-destructive",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
