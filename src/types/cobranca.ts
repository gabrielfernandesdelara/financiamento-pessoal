import { z } from "zod";

export const CobrancaSchema = z.object({
  id: z.string(),
  nomePessoa: z.string().min(1, "Informe o nome da pessoa"),
  valorDevido: z.coerce.number().positive("O valor deve ser maior que zero"),
  nomeCompra: z.string().min(1, "Informe a compra ou referência"),
  ehParcelado: z.boolean().default(false),
  quantidadeParcelas: z.coerce.number().int().positive().nullable(),
  valorTotal: z.coerce.number().positive("O valor total deve ser maior que zero"),
  dataVencimento: z.string().min(1, "Informe a data de vencimento"),
  categoria: z.string().default("Cobrança"),
  createdAt: z.string().optional(),
});

export type Cobranca = z.infer<typeof CobrancaSchema>;

export const CobrancaInputSchema = CobrancaSchema.omit({ id: true, createdAt: true });
export type CobrancaInput = z.infer<typeof CobrancaInputSchema>;
