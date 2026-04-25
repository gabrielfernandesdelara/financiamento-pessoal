import { z } from "zod";

export const PrevisaoSchema = z.object({
  id: z.string(),
  descricao: z.string().min(1, "Informe a descrição"),
  valor: z.coerce.number().positive("O valor deve ser maior que zero"),
  dataPrevista: z.string().min(1, "Informe a data prevista"),
  parcelada: z.boolean().default(false),
  totalParcelas: z.coerce.number().int().positive().nullable(),
  valorParcela: z.coerce.number().nonnegative(),
  categoria: z.string().default("Previsão"),
  recorrente: z.boolean().default(false),
  createdAt: z.string().optional(),
});

export type Previsao = z.infer<typeof PrevisaoSchema>;

export const PrevisaoInputSchema = PrevisaoSchema.omit({ id: true, createdAt: true });
export type PrevisaoInput = z.infer<typeof PrevisaoInputSchema>;
