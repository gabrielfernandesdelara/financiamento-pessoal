import type {
  Transaction,
  TransactionInput,
} from "@/types/transaction";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export type BulkImportResponse = {
  inserted: number;
  skipped: number;
  transactions: Transaction[];
};

export const transactionsClient = {
  list: () =>
    fetch("/api/transactions", { cache: "no-store" }).then(
      handle<Transaction[]>,
    ),

  create: (input: TransactionInput) =>
    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Transaction>),

  update: (id: string, input: TransactionInput) =>
    fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Transaction>),

  remove: (id: string) =>
    fetch(`/api/transactions/${id}`, { method: "DELETE" }).then(
      handle<{ ok: true }>,
    ),

  bulk: (transactions: Array<TransactionInput & { id?: string }>) =>
    fetch("/api/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions }),
    }).then(handle<BulkImportResponse>),
};
