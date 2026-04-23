import { type Compra, type CompraInput } from "@/types/compra";
import { type Profile, type ProfileInput } from "@/types/profile";
import { type Cobranca, type CobrancaInput } from "@/types/cobranca";
import { type Bonus, type BonusInput } from "@/types/bonus";
import { type Previsao, type PrevisaoInput } from "@/types/previsao";
import { createSupabaseServiceClient } from "@/lib/supabase";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Compras ─────────────────────────────────────────────────────────────────

type CompraRow = {
  id: string;
  user_id: string;
  nome: string;
  cartao_ou_pessoa: string;
  total_parcelas: number | null;
  parcelas_restantes: number | null;
  data_inicio: string;
  valor_parcela: number;
  valor_total: number;
  parcelada: boolean;
  categoria: string;
  quitada: boolean;
  created_at: string;
};

function toCompra(row: CompraRow): Compra {
  return {
    id: row.id,
    nome: row.nome,
    cartaoOuPessoa: row.cartao_ou_pessoa,
    totalParcelas: row.total_parcelas,
    parcelasRestantes: row.parcelas_restantes,
    dataInicio: row.data_inicio,
    valorParcela: row.valor_parcela,
    valorTotal: row.valor_total,
    parcelada: row.parcelada,
    categoria: row.categoria ?? "Outros",
    quitada: row.quitada ?? false,
    createdAt: row.created_at,
  };
}

const COMPRA_COLS =
  "id,user_id,nome,cartao_ou_pessoa,total_parcelas,parcelas_restantes,data_inicio,valor_parcela,valor_total,parcelada,categoria,quitada,created_at";

export async function listCompras(_: string, userId: string): Promise<Compra[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("compras")
    .select(COMPRA_COLS)
    .eq("user_id", userId)
    .eq("quitada", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toCompra(r as CompraRow));
}

export async function listAllCompras(_: string, userId: string): Promise<Compra[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("compras")
    .select(COMPRA_COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toCompra(r as CompraRow));
}

export async function appendCompra(_: string, userId: string, input: CompraInput): Promise<Compra> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("compras")
    .insert({
      id: newId(),
      user_id: userId,
      nome: input.nome,
      cartao_ou_pessoa: input.cartaoOuPessoa,
      total_parcelas: input.totalParcelas,
      parcelas_restantes: input.parcelasRestantes ?? input.totalParcelas,
      data_inicio: input.dataInicio,
      valor_parcela: input.valorParcela,
      valor_total: input.valorTotal,
      parcelada: input.parcelada,
      categoria: input.categoria ?? "Outros",
      quitada: false,
    })
    .select(COMPRA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCompra(data as CompraRow);
}

export async function updateCompra(_: string, userId: string, id: string, input: CompraInput): Promise<Compra> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("compras")
    .update({
      nome: input.nome,
      cartao_ou_pessoa: input.cartaoOuPessoa,
      total_parcelas: input.totalParcelas,
      parcelas_restantes: input.parcelasRestantes ?? input.totalParcelas,
      data_inicio: input.dataInicio,
      valor_parcela: input.valorParcela,
      valor_total: input.valorTotal,
      parcelada: input.parcelada,
      categoria: input.categoria ?? "Outros",
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COMPRA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCompra(data as CompraRow);
}

export async function deleteCompra(_: string, userId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("compras").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export type PagarParcelaResult = { quitada: boolean; compra?: Compra };

export async function pagarParcela(_: string, userId: string, id: string): Promise<PagarParcelaResult> {
  const sb = createSupabaseServiceClient();

  const { data: current, error: fetchErr } = await sb
    .from("compras")
    .select(COMPRA_COLS)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !current) throw new Error("Compra não encontrada");
  const compra = toCompra(current as CompraRow);

  if (!compra.parcelada) {
    const { error } = await sb
      .from("compras")
      .update({ quitada: true })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { quitada: true };
  }

  const parcelas = compra.parcelasRestantes ?? compra.totalParcelas ?? 0;
  const novas = Math.max(0, parcelas - 1);

  if (novas === 0) {
    const { error } = await sb
      .from("compras")
      .update({ quitada: true, parcelas_restantes: 0, valor_total: 0 })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { quitada: true };
  }

  const { data, error } = await sb
    .from("compras")
    .update({ parcelas_restantes: novas, valor_total: novas * compra.valorParcela })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COMPRA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return { quitada: false, compra: toCompra(data as CompraRow) };
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  user_id: string;
  salario: number;
  saldo_restante: number;
};

function toProfile(row: ProfileRow): Profile {
  return { id: row.id, salario: row.salario, saldoRestante: row.saldo_restante };
}

export async function getProfile(_: string, userId: string): Promise<Profile | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("perfil")
    .select("id,user_id,salario,saldo_restante")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProfile(data as ProfileRow) : null;
}

export async function upsertProfile(_: string, userId: string, input: ProfileInput): Promise<Profile> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("perfil")
    .upsert(
      { user_id: userId, salario: input.salario, saldo_restante: input.saldoRestante },
      { onConflict: "user_id" },
    )
    .select("id,user_id,salario,saldo_restante")
    .single();
  if (error) throw new Error(error.message);
  return toProfile(data as ProfileRow);
}

// ─── Cobranças ────────────────────────────────────────────────────────────────

type CobrancaRow = {
  id: string;
  user_id: string;
  nome_pessoa: string;
  valor_devido: number;
  nome_compra: string;
  eh_parcelado: boolean;
  quantidade_parcelas: number | null;
  valor_total: number;
  data_vencimento: string;
  categoria: string;
  created_at: string;
};

function toCobranca(row: CobrancaRow): Cobranca {
  return {
    id: row.id,
    nomePessoa: row.nome_pessoa,
    valorDevido: row.valor_devido,
    nomeCompra: row.nome_compra,
    ehParcelado: row.eh_parcelado,
    quantidadeParcelas: row.quantidade_parcelas,
    valorTotal: row.valor_total,
    dataVencimento: row.data_vencimento,
    categoria: row.categoria ?? "Cobrança",
    createdAt: row.created_at,
  };
}

const COBRANCA_COLS =
  "id,user_id,nome_pessoa,valor_devido,nome_compra,eh_parcelado,quantidade_parcelas,valor_total,data_vencimento,categoria,created_at";

export async function listCobrancas(_: string, userId: string): Promise<Cobranca[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("cobrancas")
    .select(COBRANCA_COLS)
    .eq("user_id", userId)
    .order("data_vencimento", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toCobranca(r as CobrancaRow));
}

export async function appendCobranca(_: string, userId: string, input: CobrancaInput): Promise<Cobranca> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("cobrancas")
    .insert({
      id: newId(),
      user_id: userId,
      nome_pessoa: input.nomePessoa,
      valor_devido: input.valorDevido,
      nome_compra: input.nomeCompra,
      eh_parcelado: input.ehParcelado,
      quantidade_parcelas: input.quantidadeParcelas,
      valor_total: input.valorTotal,
      data_vencimento: input.dataVencimento,
      categoria: input.categoria ?? "Cobrança",
    })
    .select(COBRANCA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCobranca(data as CobrancaRow);
}

export async function updateCobranca(_: string, userId: string, id: string, input: CobrancaInput): Promise<Cobranca> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("cobrancas")
    .update({
      nome_pessoa: input.nomePessoa,
      valor_devido: input.valorDevido,
      nome_compra: input.nomeCompra,
      eh_parcelado: input.ehParcelado,
      quantidade_parcelas: input.quantidadeParcelas,
      valor_total: input.valorTotal,
      data_vencimento: input.dataVencimento,
      categoria: input.categoria ?? "Cobrança",
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COBRANCA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCobranca(data as CobrancaRow);
}

export async function deleteCobranca(_: string, userId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("cobrancas").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Bônus ────────────────────────────────────────────────────────────────────

type BonusRow = {
  id: string;
  user_id: string;
  valor: number;
  descricao: string;
  recorrente: boolean;
  created_at: string;
};

function toBonus(row: BonusRow): Bonus {
  return { id: row.id, valor: row.valor, descricao: row.descricao, recorrente: row.recorrente ?? false };
}

export async function listBonuses(_: string, userId: string): Promise<Bonus[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("bonuses")
    .select("id,user_id,valor,descricao,recorrente,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toBonus(r as BonusRow));
}

export async function appendBonus(_: string, userId: string, input: BonusInput): Promise<Bonus> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("bonuses")
    .insert({ id: newId(), user_id: userId, valor: input.valor, descricao: input.descricao, recorrente: input.recorrente ?? false })
    .select("id,user_id,valor,descricao,recorrente,created_at")
    .single();
  if (error) throw new Error(error.message);
  return toBonus(data as BonusRow);
}

export async function deleteBonus(_: string, userId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("bonuses").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Previsões ────────────────────────────────────────────────────────────────

type PrevisaoRow = {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  data_prevista: string;
  parcelada: boolean;
  total_parcelas: number | null;
  valor_parcela: number;
  categoria: string;
  created_at: string;
};

function toPrevisao(row: PrevisaoRow): Previsao {
  return {
    id: row.id,
    descricao: row.descricao,
    valor: row.valor,
    dataPrevista: row.data_prevista,
    parcelada: row.parcelada,
    totalParcelas: row.total_parcelas,
    valorParcela: row.valor_parcela,
    categoria: row.categoria ?? "Previsão",
    createdAt: row.created_at,
  };
}

const PREVISAO_COLS =
  "id,user_id,descricao,valor,data_prevista,parcelada,total_parcelas,valor_parcela,categoria,created_at";

export async function listPrevisoes(_: string, userId: string): Promise<Previsao[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("previsoes")
    .select(PREVISAO_COLS)
    .eq("user_id", userId)
    .order("data_prevista", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toPrevisao(r as PrevisaoRow));
}

export async function appendPrevisao(_: string, userId: string, input: PrevisaoInput): Promise<Previsao> {
  const sb = createSupabaseServiceClient();
  const n = (v: unknown) => Number(v) || 0;
  const valor = input.parcelada && input.totalParcelas && input.valorParcela
    ? n(input.totalParcelas) * n(input.valorParcela)
    : n(input.valor);
  const { data, error } = await sb
    .from("previsoes")
    .insert({
      id: newId(),
      user_id: userId,
      descricao: input.descricao,
      valor,
      data_prevista: input.dataPrevista,
      parcelada: input.parcelada,
      total_parcelas: input.totalParcelas,
      valor_parcela: input.valorParcela,
      categoria: input.categoria ?? "Previsão",
    })
    .select(PREVISAO_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toPrevisao(data as PrevisaoRow);
}

export async function updatePrevisao(_: string, userId: string, id: string, input: PrevisaoInput): Promise<Previsao> {
  const sb = createSupabaseServiceClient();
  const n = (v: unknown) => Number(v) || 0;
  const valor = input.parcelada && input.totalParcelas && input.valorParcela
    ? n(input.totalParcelas) * n(input.valorParcela)
    : n(input.valor);
  const { data, error } = await sb
    .from("previsoes")
    .update({
      descricao: input.descricao,
      valor,
      data_prevista: input.dataPrevista,
      parcelada: input.parcelada,
      total_parcelas: input.totalParcelas,
      valor_parcela: input.valorParcela,
      categoria: input.categoria ?? "Previsão",
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(PREVISAO_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toPrevisao(data as PrevisaoRow);
}

export async function deletePrevisao(_: string, userId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("previsoes").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Histórico agregado ───────────────────────────────────────────────────────

export async function listAllComprasAndCobrancasAndBonuses(_: string, userId: string) {
  const sb = createSupabaseServiceClient();
  const [comprasRes, cobrancasRes, bonusesRes] = await Promise.all([
    sb.from("compras").select(COMPRA_COLS).eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("cobrancas").select(COBRANCA_COLS).eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("bonuses").select("id,user_id,valor,descricao,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  if (comprasRes.error) throw new Error(comprasRes.error.message);
  if (cobrancasRes.error) throw new Error(cobrancasRes.error.message);
  if (bonusesRes.error) throw new Error(bonusesRes.error.message);
  return {
    compras: (comprasRes.data ?? []).map((r) => toCompra(r as CompraRow)),
    cobrancas: (cobrancasRes.data ?? []).map((r) => toCobranca(r as CobrancaRow)),
    bonuses: (bonusesRes.data ?? []) as { id: string; valor: number; descricao: string; created_at: string }[],
  };
}
