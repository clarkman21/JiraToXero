/**
 * Map Jira Service Desk payment CSV rows to Xero Bills format.
 * Uses mapping config for column resolution; first occurrence of duplicate Jira column names.
 */

import {
  MAPPING_FIELDS,
  REQUIRED_JIRA_COLUMNS,
  XERO_BILL_HEADER,
  type MappingField,
} from "./mappingConfig";

export { XERO_BILL_HEADER };

export type XeroBillRow = (string | number)[];

export interface ConversionError {
  row: number;
  message: string;
  field?: string;
}

export interface JiraToXeroResult {
  rows: XeroBillRow[];
  errors: ConversionError[];
}

export interface ConversionDefaults {
  taxType?: string;
  accountCode?: string;
  quantity?: number;
}

/** Build map: header name -> first column index. */
function buildColumnIndexMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    if (!map.has(h)) map.set(h, i);
  }
  return map;
}

/** Build map: header name -> all column indices (for duplicate column names). */
function buildAllIndicesMap(headers: string[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    const arr = map.get(h) ?? [];
    arr.push(i);
    map.set(h, arr);
  }
  return map;
}

/** First matching column index for a list of Jira column names. */
function getFirstColumnIndex(
  map: Map<string, number>,
  jiraSources: string[]
): number | undefined {
  for (const name of jiraSources) {
    if (map.has(name)) return map.get(name);
  }
  return undefined;
}

/** First non-empty value from any jiraSource column (tries all occurrences of each name). */
function getFirstNonEmpty(
  get: (index: number | undefined) => string,
  allIndicesMap: Map<string, number[]>,
  jiraSources: string[]
): string {
  for (const name of jiraSources) {
    const indices = allIndicesMap.get(name);
    if (indices) {
      for (const idx of indices) {
        const val = get(idx);
        if (val) return val;
      }
    }
  }
  return "";
}

/** Parse Jira date (e.g. "29/Jan/26 12:09 PM") to YYYY-MM-DD. */
export function parseJiraDate(value: string): string | null {
  const s = (value || "").trim();
  if (!s) return null;
  const match = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})(?:\s|$)/);
  if (!match) return null;
  const [, day, monStr, yearPart] = match;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const mon = months[monStr];
  if (!mon) return null;
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
  return `${year}-${mon}-${day.padStart(2, "0")}`;
}

function parseAmount(value: string): number | null {
  const s = (value || "").trim().replace(/,/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Extract contact/vendor name from Payment details: "Account Name: X" or "Name : X". */
function parseContactNameFromPaymentDetails(details: string): string | null {
  if (!details || typeof details !== "string") return null;
  const s = details.trim();
  let match = s.match(/Account\s+Name\s*:\s*([^\n]+)/i);
  if (match) return match[1].trim();
  match = s.match(/Name\s*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

const PAYMENT_DETAILS_JIRA = "Custom field (Payment details)";

export function jiraToXero(
  headers: string[],
  dataRows: string[][],
  defaults?: ConversionDefaults
): JiraToXeroResult {
  const errors: ConversionError[] = [];
  const map = buildColumnIndexMap(headers);
  const allIndicesMap = buildAllIndicesMap(headers);

  const missingRequired = (REQUIRED_JIRA_COLUMNS as readonly string[]).filter(
    (col) => !map.has(col)
  );
  if (missingRequired.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `Required Jira columns not found: ${missingRequired.join(", ")}`,
        },
      ],
    };
  }

  /** Resolved: for each Xero column index, { jiraIndex, type }. */
  const resolved: { jiraIndex: number | undefined; field: MappingField }[] = MAPPING_FIELDS.map(
    (field) => ({
      jiraIndex: getFirstColumnIndex(map, field.jiraSources),
      field,
    })
  );
  const paymentDetailsIndex = map.get(PAYMENT_DETAILS_JIRA);
  const contactField = MAPPING_FIELDS[0];

  const rows: XeroBillRow[] = [];

  for (let r = 0; r < dataRows.length; r++) {
    const rowIndex = r + 1;
    const row = dataRows[r];
    const get = (index: number | undefined): string =>
      index !== undefined && row[index] !== undefined ? String(row[index]).trim() : "";

    const firstCell = (row?.[0] ?? "").toString().trim();
    if (!firstCell) continue;

    /** ContactName: first non-empty from jiraSources, then parse Payment details for "Name :" or "Account Name:". */
    let contactName = "";
    for (const src of contactField.jiraSources) {
      const idx = getFirstColumnIndex(map, [src]);
      const val = get(idx);
      if (val) {
        contactName = val;
        break;
      }
    }
    if (!contactName && paymentDetailsIndex !== undefined) {
      const parsed = parseContactNameFromPaymentDetails(get(paymentDetailsIndex));
      if (parsed) contactName = parsed;
    }

    const rawValues: (string | number)[] = resolved.map(({ jiraIndex, field }) => {
      if (field.type === "contact") return contactName;
      if (field.type === "date") {
        for (const src of field.jiraSources) {
          const indices = allIndicesMap.get(src);
          if (indices) {
            for (const idx of indices) {
              const val = get(idx);
              const parsed = parseJiraDate(val);
              if (parsed) return parsed;
            }
          }
        }
        return "";
      }
      if (field.type === "amount") {
        for (const src of field.jiraSources) {
          const indices = allIndicesMap.get(src);
          if (indices) {
            for (const idx of indices) {
              const val = get(idx);
              const n = parseAmount(val);
              if (n !== null) return n;
            }
          }
        }
        return "";
      }
      const raw = getFirstNonEmpty(get, allIndicesMap, field.jiraSources) || get(jiraIndex);
      return raw;
    });

    const issueKey = rawValues[10] as string;
    const invoiceDate = rawValues[11] as string;
    const dueDate = (rawValues[12] as string) || invoiceDate;
    const total = rawValues[13];
    const amountNum = typeof total === "number" ? total : parseAmount(String(total ?? ""));
    const summary = rawValues[15] as string;
    const currency = (rawValues[25] as string) || "";

    const rowErrors: string[] = [];
    if (!contactName) rowErrors.push("ContactName");
    if (!issueKey) rowErrors.push("InvoiceNumber");
    if (!invoiceDate) rowErrors.push("InvoiceDate");
    if (!dueDate) rowErrors.push("DueDate");
    if (amountNum === null || amountNum === undefined)
      rowErrors.push("Amount (missing or invalid)");
    else if (typeof amountNum !== "number") rowErrors.push("Amount (invalid number)");

    if (rowErrors.length > 0) {
      errors.push({
        row: rowIndex,
        message: `Row ${rowIndex}: Missing or invalid required value for ${rowErrors.join(", ")}`,
        field: rowErrors[0],
      });
      continue;
    }

    const totalNum = typeof amountNum === "number" ? amountNum : 0;
    const quantity = defaults?.quantity ?? 1;
    const unitAmount = totalNum;
    const accountCode = defaults?.accountCode ?? "";
    const taxType = defaults?.taxType ?? "None";
    const poCountry = (rawValues[9] as string) || "";

    const xeroRow: XeroBillRow = [
      contactName,
      "",
      "", "", "", "", "", "", "", poCountry,
      issueKey,
      invoiceDate,
      dueDate,
      totalNum,
      "",
      summary,
      quantity,
      unitAmount,
      accountCode,
      taxType,
      "",
      "", "", "", "",
      currency,
    ];
    rows.push(xeroRow);
  }

  return { rows, errors };
}
