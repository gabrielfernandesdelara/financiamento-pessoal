import type { Transaction, TransactionType } from "@/types/transaction";

export type ParsedRow = {
  /** Stable ID from the source (e.g. Nubank "Identificador"). Used for dedup. */
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive
  type: TransactionType;
  category: string;
  recurring: false;
  /** Original raw description, kept for reference. */
  raw: string;
};

export type ParseResult = {
  bank: SupportedBank;
  rows: ParsedRow[];
  errors: { line: number; message: string }[];
};

export type SupportedBank = "nubank";

/** Minimal RFC-4180 line splitter that handles quoted fields with embedded commas. */
function splitCsvLine(line: string, sep = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === sep && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function splitCsv(content: string): string[][] {
  // Strip BOM if present.
  const text = content.replace(/^\uFEFF/, "");
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => splitCsvLine(l));
}

function detectBank(headers: string[]): SupportedBank | null {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const has = (...needles: string[]) =>
    needles.every((n) => norm.includes(n));
  // Nubank: Data, Valor, Identificador, Descrição
  if (has("data", "valor", "identificador", "descrição")) return "nubank";
  return null;
}

/** "01/01/2026" → "2026-01-01" */
function parseBrDate(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Cleans up Nubank-style descriptions into something readable. */
function cleanNubankDescription(raw: string): {
  description: string;
  category: string;
} {
  const r = raw.trim();

  // "Transferência recebida pelo Pix - NOME - ..."
  let m = /^Transfer[êe]ncia recebida pelo Pix\s*-\s*([^-]+?)(\s*-|$)/i.exec(r);
  if (m) return { description: `Pix recebido — ${titleCase(m[1])}`, category: "Transferências" };

  m = /^Transfer[êe]ncia enviada pelo Pix\s*-\s*([^-]+?)(\s*-|$)/i.exec(r);
  if (m) return { description: `Pix enviado — ${titleCase(m[1])}`, category: "Transferências" };

  m = /^Pagamento de boleto efetuado\s*-\s*(.+)$/i.exec(r);
  if (m) return { description: `Boleto — ${titleCase(m[1])}`, category: "Contas" };

  m = /^Compra no d[ée]bito\s*-\s*(.+)$/i.exec(r);
  if (m) return { description: titleCase(m[1]), category: categorizeMerchant(m[1]) };

  m = /^Compra no cr[ée]dito\s*-\s*(.+)$/i.exec(r);
  if (m) return { description: titleCase(m[1]), category: categorizeMerchant(m[1]) };

  m = /^Estorno de compra\s*-\s*(.+)$/i.exec(r);
  if (m) return { description: `Estorno — ${titleCase(m[1])}`, category: "Estornos" };

  m = /^Resgate RDB$/i.exec(r);
  if (m) return { description: "Resgate RDB", category: "Investimentos" };

  m = /^Aplica[çc][ãa]o RDB$/i.exec(r);
  if (m) return { description: "Aplicação RDB", category: "Investimentos" };

  // Generic fallback: first 80 chars, title-cased.
  return {
    description: r.length > 80 ? r.slice(0, 77) + "…" : r,
    category: "Outros",
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-zà-ú])([a-zà-ú]*)/gi, (_, a: string, b: string) =>
      a.toUpperCase() + b,
    )
    .trim();
}

const MERCHANT_RULES: { match: RegExp; category: string }[] = [
  { match: /ifood|rappi|uber eats|james/i, category: "Alimentação" },
  { match: /uber|99 ?app|99 ?taxi|cabify|blablacar/i, category: "Transporte" },
  { match: /posto|combust[íi]vel|shell|ipiranga|petrobr[áa]s|ale /i, category: "Combustível" },
  { match: /mercado|carrefour|p[ãa]o de a[çc][úu]car|extra|atacad[ãa]o|assa[íi]|big|dia%/i, category: "Mercado" },
  { match: /farmacia|farm[áa]cia|drogaria|drogasil|raia|pacheco|pague menos/i, category: "Saúde" },
  { match: /netflix|spotify|disney|hbo|prime video|youtube premium|deezer|globoplay/i, category: "Assinaturas" },
  { match: /amazon|magalu|magazine luiza|shopee|aliexpress|mercado livre|americanas/i, category: "Compras" },
  { match: /enel|cemig|copel|light|sabesp|cedae|comgas|gas natural|claro|vivo|tim|oi/i, category: "Contas" },
  { match: /escola|faculdade|udemy|alura|coursera|duolingo/i, category: "Educação" },
  { match: /cinema|ingresso|teatro|show/i, category: "Lazer" },
];

function categorizeMerchant(text: string): string {
  for (const rule of MERCHANT_RULES) {
    if (rule.match.test(text)) return rule.category;
  }
  return "Outros";
}

function parseNubank(rows: string[][]): ParseResult {
  const result: ParseResult = { bank: "nubank", rows: [], errors: [] };
  const [header, ...body] = rows;
  const idx = {
    date: header.findIndex((h) => h.trim().toLowerCase() === "data"),
    amount: header.findIndex((h) => h.trim().toLowerCase() === "valor"),
    id: header.findIndex((h) => h.trim().toLowerCase() === "identificador"),
    desc: header.findIndex((h) => h.trim().toLowerCase() === "descrição"),
  };

  body.forEach((cols, i) => {
    const lineNum = i + 2; // +1 for header, +1 for 1-indexing
    const dateRaw = cols[idx.date];
    const amountRaw = cols[idx.amount];
    const id = (cols[idx.id] ?? "").trim();
    const descRaw = (cols[idx.desc] ?? "").trim();

    const date = parseBrDate(dateRaw ?? "");
    if (!date) {
      result.errors.push({ line: lineNum, message: `Data inválida: "${dateRaw}"` });
      return;
    }
    const amountNum = Number(amountRaw);
    if (!Number.isFinite(amountNum)) {
      result.errors.push({ line: lineNum, message: `Valor inválido: "${amountRaw}"` });
      return;
    }
    if (!id) {
      result.errors.push({ line: lineNum, message: "Identificador ausente" });
      return;
    }

    const type: TransactionType = amountNum >= 0 ? "income" : "expense";
    const { description, category } = cleanNubankDescription(descRaw);

    result.rows.push({
      id,
      date,
      description,
      amount: Math.abs(amountNum),
      type,
      category,
      recurring: false,
      raw: descRaw,
    });
  });

  return result;
}

export function parseCsv(content: string): ParseResult {
  const rows = splitCsv(content);
  if (rows.length === 0) {
    return {
      bank: "nubank",
      rows: [],
      errors: [{ line: 0, message: "Arquivo vazio" }],
    };
  }
  const bank = detectBank(rows[0]);
  if (!bank) {
    return {
      bank: "nubank",
      rows: [],
      errors: [
        {
          line: 1,
          message:
            "Layout não reconhecido. Cabeçalhos esperados: Data, Valor, Identificador, Descrição",
        },
      ],
    };
  }
  if (bank === "nubank") return parseNubank(rows);
  return { bank, rows: [], errors: [{ line: 1, message: "Banco não suportado" }] };
}

/** Convert a parsed row into a full Transaction (with stable ID). */
export function rowToTransaction(row: ParsedRow): Transaction {
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
