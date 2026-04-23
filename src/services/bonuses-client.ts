import type { Bonus, BonusInput } from "@/types/bonus";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const bonusesClient = {
  list: () =>
    fetch("/api/bonuses", { cache: "no-store" }).then(handle<Bonus[]>),

  create: (input: BonusInput) =>
    fetch("/api/bonuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Bonus>),

  remove: (id: string) =>
    fetch(`/api/bonuses/${id}`, { method: "DELETE" }).then(handle<{ ok: true }>),
};
