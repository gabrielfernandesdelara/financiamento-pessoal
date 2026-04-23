import { google, type sheets_v4 } from "googleapis";
import {
  type Transaction,
  type TransactionInput,
} from "@/types/transaction";

const SPREADSHEET_NAME = "Finance App Data";
const SHEET_TITLE = "transactions";
const HEADERS = [
  "id",
  "date",
  "description",
  "amount",
  "type",
  "category",
  "recurring",
] as const;

function client(accessToken: string) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return {
    sheets: google.sheets({ version: "v4", auth: oauth2 }),
    drive: google.drive({ version: "v3", auth: oauth2 }),
  };
}

/**
 * Locate the spreadsheet by name in the user's Drive (or create it).
 * Drive is the source of truth for the spreadsheet ID.
 */
export async function findOrCreateSpreadsheet(
  accessToken: string,
): Promise<string> {
  const { drive, sheets } = client(accessToken);

  const list = await drive.files.list({
    q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 10,
  });

  const existing = list.data.files?.[0];
  if (existing?.id) {
    await ensureSheet(sheets, existing.id);
    return existing.id;
  }

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SPREADSHEET_NAME },
      sheets: [
        {
          properties: { title: SHEET_TITLE },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: HEADERS.map((h) => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    },
  });

  const id = created.data.spreadsheetId;
  if (!id) throw new Error("Falha ao criar a planilha");
  return id;
}

async function ensureSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const has = meta.data.sheets?.some(
    (s) => s.properties?.title === SHEET_TITLE,
  );
  if (has) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { addSheet: { properties: { title: SHEET_TITLE } } },
      ],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TITLE}!A1:G1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS as unknown as string[]] },
  });
}

function parseAmount(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (raw == null) return 0;
  // Tolerate locale-formatted strings like "1.234,56" or "1,234.56".
  let s = String(raw).trim();
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // Comma is the decimal separator → drop dots, swap comma for dot.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // Dot is the decimal separator (or no decimals) → drop commas.
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function rowToTransaction(row: unknown[]): Transaction | null {
  if (!row[0]) return null;
  const recurringRaw = row[6];
  const recurring =
    typeof recurringRaw === "boolean"
      ? recurringRaw
      : String(recurringRaw ?? "").toLowerCase() === "true";
  return {
    id: String(row[0]),
    date: String(row[1] ?? ""),
    description: String(row[2] ?? ""),
    amount: parseAmount(row[3]),
    type: row[4] === "income" ? "income" : "expense",
    category: String(row[5] ?? ""),
    recurring,
  };
}

function transactionToRow(t: Transaction): (string | number | boolean)[] {
  return [t.id, t.date, t.description, t.amount, t.type, t.category, t.recurring];
}

export async function listTransactions(
  accessToken: string,
  spreadsheetId: string,
): Promise<Transaction[]> {
  const { sheets } = client(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A2:G`,
    // Avoid locale-formatted strings (e.g. "27,24") that would parse as NaN.
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  const rows = res.data.values ?? [];
  return rows
    .map(rowToTransaction)
    .filter((t): t is Transaction => t !== null);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function appendTransaction(
  accessToken: string,
  spreadsheetId: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { sheets } = client(accessToken);
  const transaction: Transaction = { id: newId(), ...input };
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TITLE}!A:G`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [transactionToRow(transaction)] },
  });
  return transaction;
}

export async function listExistingIds(
  accessToken: string,
  spreadsheetId: string,
): Promise<Set<string>> {
  const { sheets } = client(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A2:A`,
  });
  const rows = res.data.values ?? [];
  return new Set(rows.map((r) => String(r[0] ?? "")).filter(Boolean));
}

export type BulkAppendResult = {
  inserted: Transaction[];
  skipped: number;
};

/**
 * Bulk-append many transactions in a single Sheets call. Skips rows whose ID
 * already exists in the sheet (dedup). Rows without an ID get a fresh UUID.
 */
export async function appendTransactionsBulk(
  accessToken: string,
  spreadsheetId: string,
  inputs: Array<TransactionInput & { id?: string }>,
): Promise<BulkAppendResult> {
  const { sheets } = client(accessToken);
  const existing = await listExistingIds(accessToken, spreadsheetId);

  const inserted: Transaction[] = [];
  let skipped = 0;
  for (const input of inputs) {
    const id = input.id?.trim() || newId();
    if (existing.has(id)) {
      skipped++;
      continue;
    }
    existing.add(id);
    const { id: _omit, ...rest } = input;
    void _omit;
    inserted.push({ id, ...rest });
  }

  if (inserted.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TITLE}!A:G`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: inserted.map(transactionToRow) },
    });
  }

  return { inserted, skipped };
}

async function findRowIndex(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  id: string,
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_TITLE}!A2:A`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === id);
  if (idx === -1) throw new Error("Transação não encontrada");
  return idx + 2; // 1-indexed + header row
}

export async function updateTransaction(
  accessToken: string,
  spreadsheetId: string,
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { sheets } = client(accessToken);
  const rowNumber = await findRowIndex(sheets, spreadsheetId, id);
  const transaction: Transaction = { id, ...input };
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TITLE}!A${rowNumber}:G${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [transactionToRow(transaction)] },
  });
  return transaction;
}

export async function deleteTransaction(
  accessToken: string,
  spreadsheetId: string,
  id: string,
): Promise<void> {
  const { sheets } = client(accessToken);
  const rowNumber = await findRowIndex(sheets, spreadsheetId, id);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = meta.data.sheets?.find(
    (s) => s.properties?.title === SHEET_TITLE,
  )?.properties?.sheetId;
  if (sheetId == null) throw new Error("Aba da planilha não encontrada");

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}
