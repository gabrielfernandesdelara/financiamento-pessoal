import type { Previsao, PrevisaoInput } from "@/types/previsao";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const previsoesClient = {
  list: () =>
    fetch("/api/previsoes", { cache: "no-store" }).then(handle<Previsao[]>),

  create: (input: PrevisaoInput) =>
    fetch("/api/previsoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Previsao>),

  update: (id: string, input: PrevisaoInput) =>
    fetch(`/api/previsoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Previsao>),

  remove: (id: string) =>
    fetch(`/api/previsoes/${id}`, { method: "DELETE" }).then(handle<{ ok: true }>),
};
