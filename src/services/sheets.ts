import {
  type Transaction,
  type TransactionInput,
} from "@/types/transaction";
import {
  type Purchase,
  type PurchaseInput,
  type Income,
  type IncomeInput,
} from "@/types/purchase";
import { type Compra, type CompraInput } from "@/types/compra";
import { type Profile, type ProfileInput } from "@/types/profile";
import { type Cobranca, type CobrancaInput } from "@/types/cobranca";
import { type Bonus, type BonusInput } from "@/types/bonus";
import { createSupabaseServiceClient } from "@/lib/supabase";

type TransactionRow = {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  recurring: boolean;
};

type PurchaseRow = {
  id: string;
  user_id: string;
  produto: string;
  pagar_onde: string;
  parcelado: boolean;
  parcela_total: number | null;
  data_inicio: string;
  valor_parcela: number;
  valor_total: number;
};

type IncomeRow = {
  id: string;
  user_id: string;
  fonte: string;
  valor: number;
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    type: row.type,
    category: row.category,
    recurring: row.recurring,
  };
}

function toPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    produto: row.produto,
    pagarOnde: row.pagar_onde,
    parcelado: row.parcelado,
    parcelaTotal: row.parcela_total,
    dataInicio: row.data_inicio,
    valorParcela: row.valor_parcela,
    valorTotal: row.valor_total,
  };
}

function toIncome(row: IncomeRow): Income {
  return {
    id: row.id,
    fonte: row.fonte,
    valor: row.valor,
  };
}

export async function findOrCreateSpreadsheet(_userId: string): Promise<string> {
  return "supabase";
}

export async function listTransactions(
  accessToken: string,
  userId: string,
): Promise<Transaction[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,user_id,date,description,amount,type,category,recurring")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toTransaction(row as TransactionRow));
}

export async function appendTransaction(
  accessToken: string,
  userId: string,
  input: TransactionInput,
): Promise<Transaction> {
  const supabase = createSupabaseServiceClient();
  const id = newId();
  const row = {
    id,
    user_id: userId,
    date: input.date,
    description: input.description,
    amount: input.amount,
    type: input.type,
    category: input.category,
    recurring: input.recurring,
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select("id,user_id,date,description,amount,type,category,recurring")
    .single();

  if (error) throw new Error(error.message);
  return toTransaction(data as TransactionRow);
}

export async function listExistingIds(
  accessToken: string,
  userId: string,
): Promise<Set<string>> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => String((row as { id: string }).id)));
}

export type BulkAppendResult = {
  inserted: Transaction[];
  skipped: number;
};

export async function appendTransactionsBulk(
  accessToken: string,
  userId: string,
  inputs: Array<TransactionInput & { id?: string }>,
): Promise<BulkAppendResult> {
  const existing = await listExistingIds(accessToken, userId);

  const insertedRows: TransactionRow[] = [];
  let skipped = 0;

  for (const input of inputs) {
    const id = input.id?.trim() || newId();
    if (existing.has(id)) {
      skipped++;
      continue;
    }

    existing.add(id);
    insertedRows.push({
      id,
      user_id: userId,
      date: input.date,
      description: input.description,
      amount: input.amount,
      type: input.type,
      category: input.category,
      recurring: input.recurring,
    });
  }

  if (insertedRows.length > 0) {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("transactions").insert(insertedRows);
    if (error) throw new Error(error.message);
  }

  return { inserted: insertedRows.map(toTransaction), skipped };
}

export async function updateTransaction(
  accessToken: string,
  userId: string,
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      date: input.date,
      description: input.description,
      amount: input.amount,
      type: input.type,
      category: input.category,
      recurring: input.recurring,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id,user_id,date,description,amount,type,category,recurring")
    .single();

  if (error) throw new Error(error.message);
  return toTransaction(data as TransactionRow);
}

export async function deleteTransaction(
  accessToken: string,
  userId: string,
  id: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

const PURCHASE_COLS =
  "id,user_id,produto,pagar_onde,parcelado,parcela_total,data_inicio,valor_parcela,valor_total";

export async function listPurchases(
  accessToken: string,
  userId: string,
): Promise<Purchase[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("purchases")
    .select(PURCHASE_COLS)
    .eq("user_id", userId)
    .order("data_inicio", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toPurchase(row as PurchaseRow));
}

export async function appendPurchase(
  accessToken: string,
  userId: string,
  input: PurchaseInput,
): Promise<Purchase> {
  const supabase = createSupabaseServiceClient();
  const id = newId();

  const { data, error } = await supabase
    .from("purchases")
    .insert({
      id,
      user_id: userId,
      produto: input.produto,
      pagar_onde: input.pagarOnde,
      parcelado: input.parcelado,
      parcela_total: input.parcelaTotal,
      data_inicio: input.dataInicio,
      valor_parcela: input.valorParcela,
      valor_total: input.valorTotal,
    })
    .select(PURCHASE_COLS)
    .single();

  if (error) throw new Error(error.message);
  return toPurchase(data as PurchaseRow);
}

export async function updatePurchase(
  accessToken: string,
  userId: string,
  id: string,
  input: PurchaseInput,
): Promise<Purchase> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("purchases")
    .update({
      produto: input.produto,
      pagar_onde: input.pagarOnde,
      parcelado: input.parcelado,
      parcela_total: input.parcelaTotal,
      data_inicio: input.dataInicio,
      valor_parcela: input.valorParcela,
      valor_total: input.valorTotal,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(PURCHASE_COLS)
    .single();

  if (error) throw new Error(error.message);
  return toPurchase(data as PurchaseRow);
}

export async function deletePurchase(
  accessToken: string,
  userId: string,
  id: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("purchases")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function listIncome(
  accessToken: string,
  userId: string,
): Promise<Income[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("income")
    .select("id,user_id,fonte,valor")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toIncome(row as IncomeRow));
}

export async function appendIncome(
  accessToken: string,
  userId: string,
  input: IncomeInput,
): Promise<Income> {
  const supabase = createSupabaseServiceClient();
  const id = newId();
  const { data, error } = await supabase
    .from("income")
    .insert({ id, user_id: userId, fonte: input.fonte, valor: input.valor })
    .select("id,user_id,fonte,valor")
    .single();

  if (error) throw new Error(error.message);
  return toIncome(data as IncomeRow);
}

export async function updateIncome(
  accessToken: string,
  userId: string,
  id: string,
  input: IncomeInput,
): Promise<Income> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("income")
    .update({ fonte: input.fonte, valor: input.valor })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id,user_id,fonte,valor")
    .single();

  if (error) throw new Error(error.message);
  return toIncome(data as IncomeRow);
}

export async function deleteIncome(
  accessToken: string,
  userId: string,
  id: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("income")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// ─── deleteAllTransactions ────────────────────────────────────────────────────

export async function deleteAllTransactions(
  accessToken: string,
  userId: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
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
  };
}

const COMPRA_COLS =
  "id,user_id,nome,cartao_ou_pessoa,total_parcelas,parcelas_restantes,data_inicio,valor_parcela,valor_total,parcelada";

export async function listCompras(
  accessToken: string,
  userId: string,
): Promise<Compra[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("compras")
    .select(COMPRA_COLS)
    .eq("user_id", userId)
    .order("data_inicio", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toCompra(row as CompraRow));
}

export async function appendCompra(
  accessToken: string,
  userId: string,
  input: CompraInput,
): Promise<Compra> {
  const supabase = createSupabaseServiceClient();
  const id = newId();
  const { data, error } = await supabase
    .from("compras")
    .insert({
      id,
      user_id: userId,
      nome: input.nome,
      cartao_ou_pessoa: input.cartaoOuPessoa,
      total_parcelas: input.totalParcelas,
      parcelas_restantes: input.parcelasRestantes ?? input.totalParcelas,
      data_inicio: input.dataInicio,
      valor_parcela: input.valorParcela,
      valor_total: input.valorTotal,
      parcelada: input.parcelada,
    })
    .select(COMPRA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCompra(data as CompraRow);
}

export async function updateCompra(
  accessToken: string,
  userId: string,
  id: string,
  input: CompraInput,
): Promise<Compra> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
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
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COMPRA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCompra(data as CompraRow);
}

export async function deleteCompra(
  accessToken: string,
  userId: string,
  id: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("compras")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Perfil ───────────────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  user_id: string;
  salario: number;
  saldo_restante: number;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    salario: row.salario,
    saldoRestante: row.saldo_restante,
  };
}

export async function getProfile(
  accessToken: string,
  userId: string,
): Promise<Profile | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("perfil")
    .select("id,user_id,salario,saldo_restante")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProfile(data as ProfileRow) : null;
}

export async function upsertProfile(
  accessToken: string,
  userId: string,
  input: ProfileInput,
): Promise<Profile> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
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
  };
}

const COBRANCA_COLS =
  "id,user_id,nome_pessoa,valor_devido,nome_compra,eh_parcelado,quantidade_parcelas,valor_total,data_vencimento";

export async function listCobrancas(
  accessToken: string,
  userId: string,
): Promise<Cobranca[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cobrancas")
    .select(COBRANCA_COLS)
    .eq("user_id", userId)
    .order("data_vencimento", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toCobranca(row as CobrancaRow));
}

export async function appendCobranca(
  accessToken: string,
  userId: string,
  input: CobrancaInput,
): Promise<Cobranca> {
  const supabase = createSupabaseServiceClient();
  const id = newId();
  const { data, error } = await supabase
    .from("cobrancas")
    .insert({
      id,
      user_id: userId,
      nome_pessoa: input.nomePessoa,
      valor_devido: input.valorDevido,
      nome_compra: input.nomeCompra,
      eh_parcelado: input.ehParcelado,
      quantidade_parcelas: input.quantidadeParcelas,
      valor_total: input.valorTotal,
      data_vencimento: input.dataVencimento,
    })
    .select(COBRANCA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCobranca(data as CobrancaRow);
}

export async function updateCobranca(
  accessToken: string,
  userId: string,
  id: string,
  input: CobrancaInput,
): Promise<Cobranca> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cobrancas")
    .update({
      nome_pessoa: input.nomePessoa,
      valor_devido: input.valorDevido,
      nome_compra: input.nomeCompra,
      eh_parcelado: input.ehParcelado,
      quantidade_parcelas: input.quantidadeParcelas,
      valor_total: input.valorTotal,
      data_vencimento: input.dataVencimento,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COBRANCA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return toCobranca(data as CobrancaRow);
}

export async function deleteCobranca(
  accessToken: string,
  userId: string,
  id: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("cobrancas")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Bônus ────────────────────────────────────────────────────────────────────

type BonusRow = {
  id: string;
  user_id: string;
  valor: number;
  descricao: string;
  created_at: string;
};

function toBonus(row: BonusRow): Bonus {
  return { id: row.id, valor: row.valor, descricao: row.descricao };
}

export async function listBonuses(
  _accessToken: string,
  userId: string,
): Promise<Bonus[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("bonuses")
    .select("id,user_id,valor,descricao,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toBonus(row as BonusRow));
}

export async function appendBonus(
  _accessToken: string,
  userId: string,
  input: BonusInput,
): Promise<Bonus> {
  const supabase = createSupabaseServiceClient();
  const id = newId();
  const { data, error } = await supabase
    .from("bonuses")
    .insert({ id, user_id: userId, valor: input.valor, descricao: input.descricao })
    .select("id,user_id,valor,descricao,created_at")
    .single();
  if (error) throw new Error(error.message);
  return toBonus(data as BonusRow);
}

export async function deleteBonus(
  _accessToken: string,
  userId: string,
  id: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("bonuses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
