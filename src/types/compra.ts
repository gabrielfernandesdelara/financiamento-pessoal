import { z } from "zod";

export const CATEGORIAS_SUGERIDAS = [
  "Alimentação",
  "Eletrônicos",
  "Jogos",
  "Investimento",
  "Casa",
  "Roupas",
  "Saúde",
  "Lazer",
  "Transporte",
  "Educação",
  "Assinatura",
  "Outros",
] as const;

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
  categoria: z.string().default("Outros"),
  quitada: z.boolean().default(false),
  createdAt: z.string().optional(),
});

export type Compra = z.infer<typeof CompraSchema>;

export const CompraInputSchema = CompraSchema.omit({ id: true, quitada: true, createdAt: true });
export type CompraInput = z.infer<typeof CompraInputSchema>;
