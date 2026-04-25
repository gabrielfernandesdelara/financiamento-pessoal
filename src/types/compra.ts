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

export const ParticipanteSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("cadastrado"),
    username: z.string().min(1, "Informe o nome de usuário"),
    nome: z.string().optional(),
  }),
  z.object({
    tipo: z.literal("sem_cadastro"),
    nome: z.string().min(1, "Informe o nome"),
    contato: z.string().optional(),
  }),
]);
export type Participante = z.infer<typeof ParticipanteSchema>;

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
  dividida: z.boolean().default(false),
  adicionadoPor: z.string().nullable().optional(),
  semDataTermino: z.boolean().default(false),
  divididoCom: z.array(z.string()).nullable().optional(),
});

export type Compra = z.infer<typeof CompraSchema>;

export const CompraInputSchema = CompraSchema
  .omit({ id: true, quitada: true, createdAt: true, adicionadoPor: true, dividida: true, divididoCom: true })
  .extend({
    participantes: z.array(ParticipanteSchema).optional(),
  });

export type CompraInput = z.infer<typeof CompraInputSchema>;
