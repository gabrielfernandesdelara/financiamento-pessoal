import { z } from "zod";

export const TransactionTypeEnum = z.enum(["income", "expense"]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const TransactionSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD"),
  description: z.string().min(1, "Informe a descrição").max(120),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  type: TransactionTypeEnum,
  category: z.string().min(1, "Informe a categoria").max(60),
  recurring: z.boolean().default(false),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const TransactionInputSchema = TransactionSchema.omit({ id: true });
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const TransactionFiltersSchema = z.object({
  search: z.string().optional(),
  month: z.string().optional(),
  category: z.string().optional(),
  type: TransactionTypeEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
