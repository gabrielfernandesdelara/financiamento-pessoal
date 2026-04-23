import type { Purchase, PurchaseInput } from "@/types/purchase";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const purchasesClient = {
  list: () =>
    fetch("/api/purchases", { cache: "no-store" }).then(handle<Purchase[]>),

  create: (input: PurchaseInput) =>
    fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Purchase>),

  update: (id: string, input: PurchaseInput) =>
    fetch(`/api/purchases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Purchase>),

  remove: (id: string) =>
    fetch(`/api/purchases/${id}`, { method: "DELETE" }).then(
      handle<{ ok: true }>,
    ),
};
