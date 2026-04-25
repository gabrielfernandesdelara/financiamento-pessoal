import { type Compra, type CompraInput, type Participante } from "@/types/compra";
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
  dividida: boolean;
  adicionado_por: string | null;
  sem_data_termino: boolean;
  dividido_com: string | null;
};

function toCompra(row: CompraRow): Compra {
  let divididoCom: string[] | null = null;
  if (row.dividido_com) {
    try { divididoCom = JSON.parse(row.dividido_com); } catch { divididoCom = null; }
  }
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
    dividida: row.dividida ?? false,
    adicionadoPor: row.adicionado_por ?? null,
    semDataTermino: row.sem_data_termino ?? false,
    divididoCom,
  };
}

// Full column list (requires migrations to be applied)
const COMPRA_COLS =
  "id,user_id,nome,cartao_ou_pessoa,total_parcelas,parcelas_restantes,data_inicio,valor_parcela,valor_total,parcelada,categoria,quitada,created_at,dividida,adicionado_por,sem_data_termino,dividido_com";

// Fallback without new columns (pre-migration compatibility)
const COMPRA_COLS_BASE =
  "id,user_id,nome,cartao_ou_pessoa,total_parcelas,parcelas_restantes,data_inicio,valor_parcela,valor_total,parcelada,categoria,quitada,created_at,dividida,adicionado_por";

async function queryCompras(
  sb: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  quitada?: boolean,
): Promise<CompraRow[]> {
  let query = sb.from("compras").select(COMPRA_COLS).eq("user_id", userId);
  if (quitada !== undefined) query = query.eq("quitada", quitada);
  query = query.order("created_at", { ascending: false });
  const { data, error } = await query;

  if (!error) return (data ?? []) as CompraRow[];

  // Fallback: new columns may not exist yet in the database
  console.warn("[compras] full query failed, falling back to base cols:", error.message);
  let fallback = sb.from("compras").select(COMPRA_COLS_BASE).eq("user_id", userId);
  if (quitada !== undefined) fallback = fallback.eq("quitada", quitada);
  fallback = fallback.order("created_at", { ascending: false });
  const { data: d2, error: e2 } = await fallback;
  if (e2) throw new Error(e2.message);
  return (d2 ?? []) as CompraRow[];
}

export async function listCompras(_: string, userId: string): Promise<Compra[]> {
  const sb = createSupabaseServiceClient();
  const rows = await queryCompras(sb, userId, false);
  return rows.map((r) => toCompra(r));
}

export async function listAllCompras(_: string, userId: string): Promise<Compra[]> {
  const sb = createSupabaseServiceClient();
  const rows = await queryCompras(sb, userId);
  return rows.map((r) => toCompra(r));
}

export async function findUserByEmail(email: string): Promise<string | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.rpc("find_user_by_email", { p_email: email });
  if (!error && data) return String(data);
  console.warn("[findUserByEmail] RPC failed:", error?.message);
  return null;
}

export async function appendCompra(
  _: string,
  userId: string,
  input: CompraInput,
  adicionadoPorNome?: string,
): Promise<Compra> {
  const sb = createSupabaseServiceClient();

  const participantes: Participante[] = input.participantes ?? [];
  const totalPessoas = 1 + participantes.length;
  const isDividida = participantes.length > 0;

  const nomesParticipantes = participantes.map((p) =>
    p.tipo === "cadastrado"
      ? (p.nome?.trim() || `@${p.username}`)
      : `${p.nome} (sem cadastro)`,
  );

  const baseRow = {
    nome: input.nome,
    cartao_ou_pessoa: input.cartaoOuPessoa,
    total_parcelas: input.totalParcelas,
    parcelas_restantes: input.parcelasRestantes ?? input.totalParcelas,
    data_inicio: input.dataInicio,
    valor_parcela: input.valorParcela / totalPessoas,
    valor_total: input.valorTotal / totalPessoas,
    parcelada: input.parcelada,
    categoria: input.categoria ?? "Outros",
    quitada: false,
    dividida: isDividida,
    sem_data_termino: input.semDataTermino ?? false,
    dividido_com: isDividida ? JSON.stringify(nomesParticipantes) : null,
  };

  let insertResult = await sb
    .from("compras")
    .insert({ id: newId(), user_id: userId, ...baseRow, adicionado_por: null })
    .select(COMPRA_COLS)
    .single();

  if (insertResult.error) {
    // Fallback: new columns may not exist yet — insert without them
    console.warn("[appendCompra] full insert failed, retrying without new cols:", insertResult.error.message);
    const { sem_data_termino: _s, dividido_com: _d, ...baseRowCompat } = baseRow;
    insertResult = await sb
      .from("compras")
      .insert({ id: newId(), user_id: userId, ...baseRowCompat, adicionado_por: null })
      .select(COMPRA_COLS_BASE)
      .single();
  }

  const { data, error } = insertResult;
  if (error) throw new Error(error.message);

  const compraOrigId = (data as CompraRow).id;

  for (const p of participantes) {
    if (p.tipo === "cadastrado") {
      const otherUserId = await findUserByUsername(p.username);
      if (otherUserId && otherUserId !== userId) {
        await sb.from("compras").insert({
          id: newId(),
          user_id: otherUserId,
          ...baseRow,
          dividido_com: null,
          adicionado_por: adicionadoPorNome ?? "Outro usuário",
        });
      } else if (!otherUserId) {
        console.warn("[appendCompra] User not found for username:", p.username);
      }
    } else {
      // sem_cadastro: create cobrança
      const valorDevido = input.valorTotal / totalPessoas;
      const valorParcelaDividida = input.parcelada ? input.valorParcela / totalPessoas : null;
      await sb.from("cobrancas").insert({
        id: newId(),
        user_id: userId,
        nome_pessoa: p.nome,
        valor_devido: valorDevido,
        nome_compra: input.nome,
        eh_parcelado: input.parcelada,
        quantidade_parcelas: input.parcelada ? input.totalParcelas : null,
        valor_total: input.valorTotal,
        data_vencimento: input.dataInicio,
        categoria: "Cobrança",
        compra_origem_id: compraOrigId,
        valor_parcela_dividida: valorParcelaDividida,
      });
    }
  }

  return toCompra(data as CompraRow);
}

export async function updateCompra(_: string, userId: string, id: string, input: CompraInput): Promise<Compra> {
  const sb = createSupabaseServiceClient();
  const updatePayload: Record<string, unknown> = {
    nome: input.nome,
    cartao_ou_pessoa: input.cartaoOuPessoa,
    total_parcelas: input.totalParcelas,
    parcelas_restantes: input.parcelasRestantes ?? input.totalParcelas,
    data_inicio: input.dataInicio,
    valor_parcela: input.valorParcela,
    valor_total: input.valorTotal,
    parcelada: input.parcelada,
    categoria: input.categoria ?? "Outros",
    sem_data_termino: input.semDataTermino ?? false,
  };

  let updateResult = await sb.from("compras").update(updatePayload).eq("id", id).eq("user_id", userId).select(COMPRA_COLS).single();

  if (updateResult.error) {
    const { sem_data_termino: _s, ...compatPayload } = updatePayload;
    updateResult = await sb.from("compras").update(compatPayload).eq("id", id).eq("user_id", userId).select(COMPRA_COLS_BASE).single();
  }

  if (updateResult.error) throw new Error(updateResult.error.message);
  return toCompra(updateResult.data as CompraRow);
}

export async function deleteCompra(_: string, userId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("compras").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export type PagarParcelaResult = { quitada: boolean; compra?: Compra };

export async function pagarParcela(_: string, userId: string, id: string): Promise<PagarParcelaResult> {
  const sb = createSupabaseServiceClient();

  let fetchResult = await sb.from("compras").select(COMPRA_COLS).eq("id", id).eq("user_id", userId).single();
  if (fetchResult.error) {
    fetchResult = await sb.from("compras").select(COMPRA_COLS_BASE).eq("id", id).eq("user_id", userId).single();
  }
  const { data: current, error: fetchErr } = fetchResult;

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

export type PagarTudoResult = { processadas: number };

export async function pagarTudo(
  _: string,
  userId: string,
  filtro?: string,
): Promise<PagarTudoResult> {
  const sb = createSupabaseServiceClient();

  // Use the resilient helper; filter out recorrentes client-side as fallback
  const allRows = await queryCompras(sb, userId, false);
  let compras = allRows.map((r) => toCompra(r)).filter((c) => !c.semDataTermino);
  if (filtro?.trim()) {
    compras = compras.filter((c) => c.cartaoOuPessoa === filtro.trim());
  }

  let processadas = 0;
  for (const c of compras) {
    if (!c.parcelada) {
      await sb.from("compras").update({ quitada: true }).eq("id", c.id).eq("user_id", userId);
    } else {
      const parcelas = c.parcelasRestantes ?? c.totalParcelas ?? 0;
      const novas = Math.max(0, parcelas - 1);
      if (novas === 0) {
        await sb.from("compras")
          .update({ quitada: true, parcelas_restantes: 0, valor_total: 0 })
          .eq("id", c.id).eq("user_id", userId);
      } else {
        await sb.from("compras")
          .update({ parcelas_restantes: novas, valor_total: novas * c.valorParcela })
          .eq("id", c.id).eq("user_id", userId);
      }
    }
    processadas++;
  }

  return { processadas };
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  user_id: string;
  salario: number;
  saldo_restante: number;
  username?: string | null;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    salario: row.salario,
    saldoRestante: row.saldo_restante,
    username: row.username ?? null,
  };
}

export async function getProfile(_: string, userId: string): Promise<Profile | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb
    .from("perfil")
    .select("id,user_id,salario,saldo_restante,username")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProfile(data as ProfileRow) : null;
}

export async function upsertProfile(_: string, userId: string, input: ProfileInput): Promise<Profile> {
  const sb = createSupabaseServiceClient();

  // Check if username is already taken by another user
  if (input.username?.trim()) {
    const { data: existing } = await sb
      .from("perfil")
      .select("user_id")
      .ilike("username", input.username.trim())
      .neq("user_id", userId)
      .maybeSingle();
    if (existing) throw new Error("Este nome de usuário já está em uso.");
  }

  const upsertData: Record<string, unknown> = {
    user_id: userId,
    salario: input.salario,
    saldo_restante: input.saldoRestante,
  };
  if (input.username !== undefined) {
    upsertData.username = input.username?.trim() || null;
  }

  const { data, error } = await sb
    .from("perfil")
    .upsert(upsertData, { onConflict: "user_id" })
    .select("id,user_id,salario,saldo_restante,username")
    .single();
  if (error) throw new Error(error.message);
  return toProfile(data as ProfileRow);
}

export async function findUserByUsername(username: string): Promise<string | null> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.rpc("find_user_by_username", { p_username: username });
  if (!error && data) return String(data);

  // Fallback: direct query
  console.warn("[findUserByUsername] RPC failed, using direct query:", error?.message);
  const { data: row } = await sb
    .from("perfil")
    .select("user_id")
    .ilike("username", username)
    .maybeSingle();
  return row?.user_id ?? null;
}

export async function getEmailByUserId(userId: string): Promise<string | null> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
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
  compra_origem_id: string | null;
  valor_parcela_dividida: number | null;
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
    compraOrigemId: row.compra_origem_id ?? null,
    valorParcelaDividida: row.valor_parcela_dividida ?? null,
  };
}

const COBRANCA_COLS =
  "id,user_id,nome_pessoa,valor_devido,nome_compra,eh_parcelado,quantidade_parcelas,valor_total,data_vencimento,categoria,created_at,compra_origem_id,valor_parcela_dividida";

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
      compra_origem_id: input.compraOrigemId ?? null,
      valor_parcela_dividida: input.valorParcelaDividida ?? null,
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
  recorrente?: boolean;
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
    recorrente: row.recorrente ?? false,
    createdAt: row.created_at,
  };
}

const PREVISAO_COLS =
  "id,user_id,descricao,valor,data_prevista,parcelada,total_parcelas,valor_parcela,categoria,created_at";
const PREVISAO_COLS_FULL =
  "id,user_id,descricao,valor,data_prevista,parcelada,total_parcelas,valor_parcela,categoria,recorrente,created_at";

export async function listPrevisoes(_: string, userId: string): Promise<Previsao[]> {
  const sb = createSupabaseServiceClient();
  // Try full cols (with recorrente), fallback to base if column not yet migrated
  const { data, error } = await sb.from("previsoes").select(PREVISAO_COLS_FULL).eq("user_id", userId).order("data_prevista", { ascending: true });
  if (!error) return (data ?? []).map((r) => toPrevisao(r as unknown as PrevisaoRow));
  const { data: d2, error: e2 } = await sb.from("previsoes").select(PREVISAO_COLS).eq("user_id", userId).order("data_prevista", { ascending: true });
  if (e2) throw new Error(e2.message);
  return (d2 ?? []).map((r) => toPrevisao(r as unknown as PrevisaoRow));
}

export async function appendPrevisao(_: string, userId: string, input: PrevisaoInput): Promise<Previsao> {
  const sb = createSupabaseServiceClient();
  const n = (v: unknown) => Number(v) || 0;
  const valor = input.parcelada && input.totalParcelas && input.valorParcela
    ? n(input.totalParcelas) * n(input.valorParcela)
    : n(input.valor);

  const insertData: Record<string, unknown> = {
    id: newId(),
    user_id: userId,
    descricao: input.descricao,
    valor,
    data_prevista: input.dataPrevista,
    parcelada: input.parcelada,
    total_parcelas: input.totalParcelas,
    valor_parcela: input.valorParcela,
    categoria: input.categoria ?? "Previsão",
    recorrente: input.recorrente ?? false,
  };

  const { data: d1, error: e1 } = await sb.from("previsoes").insert(insertData).select(PREVISAO_COLS_FULL).single();
  if (!e1) return toPrevisao(d1 as unknown as PrevisaoRow);
  const { recorrente: _r, ...baseData } = insertData;
  const { data: d2, error: e2 } = await sb.from("previsoes").insert(baseData).select(PREVISAO_COLS).single();
  if (e2) throw new Error(e2.message);
  return toPrevisao(d2 as unknown as PrevisaoRow);
}

export async function updatePrevisao(_: string, userId: string, id: string, input: PrevisaoInput): Promise<Previsao> {
  const sb = createSupabaseServiceClient();
  const n = (v: unknown) => Number(v) || 0;
  const valor = input.parcelada && input.totalParcelas && input.valorParcela
    ? n(input.totalParcelas) * n(input.valorParcela)
    : n(input.valor);

  const updateData: Record<string, unknown> = {
    descricao: input.descricao,
    valor,
    data_prevista: input.dataPrevista,
    parcelada: input.parcelada,
    total_parcelas: input.totalParcelas,
    valor_parcela: input.valorParcela,
    categoria: input.categoria ?? "Previsão",
    recorrente: input.recorrente ?? false,
  };

  const { data: d1, error: e1 } = await sb.from("previsoes").update(updateData).eq("id", id).eq("user_id", userId).select(PREVISAO_COLS_FULL).single();
  if (!e1) return toPrevisao(d1 as unknown as PrevisaoRow);
  const { recorrente: _r, ...baseData } = updateData;
  const { data: d2, error: e2 } = await sb.from("previsoes").update(baseData).eq("id", id).eq("user_id", userId).select(PREVISAO_COLS).single();
  if (e2) throw new Error(e2.message);
  return toPrevisao(d2 as unknown as PrevisaoRow);
}

export async function deletePrevisao(_: string, userId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("previsoes").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Histórico agregado ───────────────────────────────────────────────────────

export type HistoricoItem = {
  id: string;
  tipo: "compra" | "cobranca" | "bonus";
  titulo: string;
  subtitulo: string;
  valor: number;
  data_ref: string;
  info: string | null;
  dividido_com?: string[] | null;
};

export async function getHistorico(_: string, userId: string): Promise<HistoricoItem[]> {
  const sb = createSupabaseServiceClient();

  const { data: rpcData, error: rpcError } = await sb.rpc("get_historico", { p_user_id: userId });
  if (!rpcError && Array.isArray(rpcData)) {
    console.log("[historico] RPC ok — items:", rpcData.length);
    return (rpcData as Array<Record<string, unknown>>).map((row) => {
      let divididoCom: string[] | null = null;
      if (row.dividido_com) {
        try { divididoCom = JSON.parse(String(row.dividido_com)); } catch { divididoCom = null; }
      }
      return {
        id: String(row.id),
        tipo: String(row.tipo) as HistoricoItem["tipo"],
        titulo: String(row.titulo ?? ""),
        subtitulo: String(row.subtitulo ?? ""),
        valor: Number(row.valor ?? 0),
        data_ref: String(row.data_ref ?? ""),
        info: row.info ? String(row.info) : null,
        dividido_com: divididoCom,
      };
    });
  }
  console.warn("[historico] RPC failed:", rpcError?.message, "— using fallback");

  const [cRes, cbRes, bRes] = await Promise.all([
    sb.from("compras")
      .select("id,nome,cartao_ou_pessoa,valor_total,parcelada,total_parcelas,parcelas_restantes,data_inicio,dividido_com")
      .eq("user_id", userId)
      .order("data_inicio", { ascending: false }),
    sb.from("cobrancas")
      .select("id,nome_pessoa,nome_compra,valor_devido,data_vencimento")
      .eq("user_id", userId)
      .order("data_vencimento", { ascending: false }),
    sb.from("bonuses")
      .select("id,valor,descricao,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const items: HistoricoItem[] = [];

  for (const r of (cRes.data ?? [])) {
    const row = r as Record<string, unknown>;
    const parcelada = Boolean(row.parcelada);
    let divididoCom: string[] | null = null;
    if (row.dividido_com) {
      try { divididoCom = JSON.parse(String(row.dividido_com)); } catch { divididoCom = null; }
    }
    items.push({
      id: String(row.id),
      tipo: "compra",
      titulo: String(row.nome ?? ""),
      subtitulo: String(row.cartao_ou_pessoa ?? ""),
      valor: Number(row.valor_total ?? 0),
      data_ref: String(row.data_inicio ?? ""),
      info: parcelada
        ? `${row.parcelas_restantes ?? row.total_parcelas ?? 0} parcelas restantes`
        : "À vista",
      dividido_com: divididoCom,
    });
  }

  for (const r of (cbRes.data ?? [])) {
    const row = r as Record<string, unknown>;
    items.push({
      id: String(row.id),
      tipo: "cobranca",
      titulo: String(row.nome_pessoa ?? ""),
      subtitulo: String(row.nome_compra ?? ""),
      valor: Number(row.valor_devido ?? 0),
      data_ref: String(row.data_vencimento ?? ""),
      info: "A receber",
    });
  }

  for (const r of (bRes.data ?? [])) {
    const row = r as Record<string, unknown>;
    items.push({
      id: String(row.id),
      tipo: "bonus",
      titulo: `Bônus: ${row.descricao ?? ""}`,
      subtitulo: "Renda extra",
      valor: Number(row.valor ?? 0),
      data_ref: String(row.created_at ?? ""),
      info: null,
    });
  }

  items.sort((a, b) => b.data_ref.localeCompare(a.data_ref));
  return items;
}
