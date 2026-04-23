import { z } from "zod";

export const BonusSchema = z.object({
  id: z.string(),
  valor: z.coerce.number().positive("O valor deve ser maior que zero"),
  descricao: z.string().min(1, "Informe a origem do bônus"),
});

export type Bonus = z.infer<typeof BonusSchema>;

export const BonusInputSchema = BonusSchema.omit({ id: true });
export type BonusInput = z.infer<typeof BonusInputSchema>;
