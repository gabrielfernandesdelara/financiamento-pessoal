import type { Profile, ProfileInput } from "@/types/profile";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const profileClient = {
  get: () =>
    fetch("/api/profile", { cache: "no-store" }).then(handle<Profile | null>),

  upsert: (input: ProfileInput) =>
    fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<Profile>),
};
