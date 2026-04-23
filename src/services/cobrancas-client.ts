import type { Cobranca, CobrancaInput } from "@/types/cobranca";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const cobrancasClient = {
  list: () =>
    fetch("/api/cobrancas", { cache: "no-store" }).then(handle<Cobranca[]>),

  create: (input: CobrancaInput) =>
    fetch("/api/cobrancas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Cobranca>),

  update: (id: string, input: CobrancaInput) =>
    fetch(`/api/cobrancas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Cobranca>),

  remove: (id: string) =>
    fetch(`/api/cobrancas/${id}`, { method: "DELETE" }).then(
      handle<{ ok: true }>,
    ),
};
