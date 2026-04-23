import { z } from "zod";

export const PurchaseSchema = z.object({
  id: z.string(),
  produto: z.string().min(1, "Informe o nome da compra"),
  pagarOnde: z.string().min(1, "Informe o cartão ou pessoa responsável"),
  parcelado: z.boolean().default(false),
  parcelaTotal: z.coerce.number().int().positive().nullable(),
  dataInicio: z.string().min(1, "Informe a data de início"),
  valorParcela: z.coerce.number().nonnegative(),
  valorTotal: z.coerce.number().positive("O valor total deve ser maior que zero"),
});

export type Purchase = z.infer<typeof PurchaseSchema>;

export const PurchaseInputSchema = PurchaseSchema.omit({ id: true });
export type PurchaseInput = z.infer<typeof PurchaseInputSchema>;

export const IncomeSchema = z.object({
  id: z.string(),
  fonte: z.string().min(1, "Informe a fonte"),
  valor: z.coerce.number(),
});

export type Income = z.infer<typeof IncomeSchema>;

export const IncomeInputSchema = IncomeSchema.omit({ id: true });
export type IncomeInput = z.infer<typeof IncomeInputSchema>;
