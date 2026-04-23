import { z } from "zod";

export const CompraSchema = z.object({
  id: z.string(),
  nome: z.string().min(1, "Informe o nome da compra"),
  cartaoOuPessoa: z.string().min(1, "Informe o cartão ou pessoa responsável"),
  totalParcelas: z.coerce.number().int().positive().nullable(),
  parcelasRestantes: z.coerce.number().int().nonnegative().nullable(),
  dataInicio: z.string().min(1, "Informe a data de início"),
  valorParcela: z.coerce.number().nonnegative(),
  valorTotal: z.coerce.number().positive("O valor total deve ser maior que zero"),
  parcelada: z.boolean().default(false),
});

export type Compra = z.infer<typeof CompraSchema>;

export const CompraInputSchema = CompraSchema.omit({ id: true });
export type CompraInput = z.infer<typeof CompraInputSchema>;
