import type { Compra, CompraInput } from "@/types/compra";

export type PagarResult = { quitada: boolean; compra?: Compra };
export type PagarTudoResult = { processadas: number };

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const comprasClient = {
  list: () =>
    fetch("/api/compras", { cache: "no-store" }).then(handle<Compra[]>),

  create: (input: CompraInput) =>
    fetch("/api/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Compra>),

  update: (id: string, input: CompraInput) =>
    fetch(`/api/compras/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Compra>),

  remove: (id: string) =>
    fetch(`/api/compras/${id}`, { method: "DELETE" }).then(handle<{ ok: true }>),

  pagar: (id: string) =>
    fetch(`/api/compras/${id}`, { method: "PATCH" }).then(handle<PagarResult>),

  pagarTudo: (filtro?: string) =>
    fetch("/api/compras/pagar-tudo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filtro }),
    }).then(handle<PagarTudoResult>),
};
