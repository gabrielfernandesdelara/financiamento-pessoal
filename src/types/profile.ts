import { z } from "zod";

export const ProfileSchema = z.object({
  id: z.string(),
  salario: z.coerce.number().nonnegative("Salário não pode ser negativo"),
  saldoRestante: z.coerce.number().default(0),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const ProfileInputSchema = ProfileSchema.omit({ id: true });
export type ProfileInput = z.infer<typeof ProfileInputSchema>;
