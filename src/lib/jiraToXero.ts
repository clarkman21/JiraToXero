/**
 * Map Jira Service Desk payment CSV rows to Xero Bills template format.
 * Uses first occurrence of duplicate Jira column names.
 */

export const XERO_BILL_HEADER = [
  "*ContactName",
  "EmailAddress",
  "POAddressLine1",
  "POAddressLine2",
  "POAddressLine3",
  "POAddressLine4",
  "POCity",
  "PORegion",
  "POPostalCode",
  "POCountry",
  "*InvoiceNumber",
  "*InvoiceDate",
  "*DueDate",
  "Total",
  "InventoryItemCode",
  "Description",
  "*Quantity",
  "*UnitAmount",
  "*AccountCode",
  "*TaxType",
  "TaxAmount",
  "TrackingName1",
  "TrackingOption1",
  "TrackingName2",
  "TrackingOption2",
  "Currency",
] as const;

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

const REQUIRED_JIRA_COLUMNS = ["Summary", "Issue key", "Created"];

const JIRA_COLUMN_ALIASES: Record<string, string[]> = {
  ContactName: [
    "Custom field (Vendor to be paid)",
    "Custom field (Supplier / Vendor)",
  ],
  Amount: [
    "Custom field (Amount)",
    "Custom field (Amount to be paid)",
    "Custom field (Total amount to be approved for payment)",
  ],
  Currency: ["Custom field (Currency)"],
  PaymentDetails: ["Custom field (Payment details)"],
  Resolved: ["Resolved"],
  DueDate: ["Due date", "Custom field (Due Date [Full))"],
};

/** Build map: logical name -> first column index in headers. */
function buildColumnIndexMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    if (!map.has(h)) map.set(h, i);
  }
  return map;
}

/** Get first matching column index for a logical field. */
function getColumnIndex(
  map: Map<string, number>,
  logicalName: string,
  aliases: string[]
): number | undefined {
  if (map.has(logicalName)) return map.get(logicalName);
  for (const alias of aliases) {
    if (map.has(alias)) return map.get(alias);
  }
  return undefined;
}

/** Parse Jira date (e.g. "29/Jan/26 12:09 PM" or "DD/MMM/YY") to YYYY-MM-DD. */
export function parseJiraDate(value: string): string | null {
  const s = (value || "").trim();
  if (!s) return null;
  // DD/MMM/YY or DD/MMM/YY HH:MM AM/PM
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
  const dd = day.padStart(2, "0");
  return `${year}-${mon}-${dd}`;
}

/** Parse amount string to number. */
function parseAmount(value: string): number | null {
  const s = (value || "").trim().replace(/,/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Extract "Account Name: X" from Payment details for ContactName fallback. */
function parseAccountNameFromPaymentDetails(details: string): string | null {
  if (!details || typeof details !== "string") return null;
  const match = details.match(/Account\s+Name\s*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

export function jiraToXero(headers: string[], dataRows: string[][]): JiraToXeroResult {
  const errors: ConversionError[] = [];
  const map = buildColumnIndexMap(headers);

  const missingRequired: string[] = [];
  for (const col of REQUIRED_JIRA_COLUMNS) {
    if (!map.has(col)) missingRequired.push(col);
  }
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

  const idxSummary = map.get("Summary")!;
  const idxIssueKey = map.get("Issue key")!;
  const idxCreated = map.get("Created")!;
  const idxResolved = getColumnIndex(map, "Resolved", JIRA_COLUMN_ALIASES.Resolved);
  const idxDueDate = getColumnIndex(map, "Due date", ["Due date", "Custom field (Due Date [Full))"]);
  const idxAmount = getColumnIndex(map, "Custom field (Amount)", JIRA_COLUMN_ALIASES.Amount);
  const idxCurrency = getColumnIndex(map, "Custom field (Currency)", JIRA_COLUMN_ALIASES.Currency);
  const idxVendor = getColumnIndex(map, "Custom field (Vendor to be paid)", JIRA_COLUMN_ALIASES.ContactName);
  const idxPaymentDetails = getColumnIndex(map, "Custom field (Payment details)", JIRA_COLUMN_ALIASES.PaymentDetails);

  const rows: XeroBillRow[] = [];

  for (let r = 0; r < dataRows.length; r++) {
    const rowIndex = r + 1;
    const row = dataRows[r];
    const get = (index: number | undefined): string =>
      index !== undefined && row[index] !== undefined ? String(row[index]).trim() : "";

    const summary = get(idxSummary);
    const issueKey = get(idxIssueKey);
    const createdStr = get(idxCreated);
    const resolvedStr = idxResolved !== undefined ? get(idxResolved) : "";
    const dueDateStr = idxDueDate !== undefined ? get(idxDueDate) : resolvedStr;
    const amountStr = idxAmount !== undefined ? get(idxAmount) : "";
    const currency = idxCurrency !== undefined ? get(idxCurrency) : "";
    const vendor = idxVendor !== undefined ? get(idxVendor) : "";
    const paymentDetails = idxPaymentDetails !== undefined ? get(idxPaymentDetails) : "";

    let contactName = vendor || parseAccountNameFromPaymentDetails(paymentDetails) || "";
    const invoiceDate = parseJiraDate(createdStr);
    const dueDate = parseJiraDate(dueDateStr) || invoiceDate;
    const amount = parseAmount(amountStr);

    const rowErrors: string[] = [];
    if (!contactName) rowErrors.push("ContactName");
    if (!issueKey) rowErrors.push("InvoiceNumber");
    if (!invoiceDate) rowErrors.push("InvoiceDate");
    if (dueDate === null && !invoiceDate) rowErrors.push("DueDate");
    if (amount === null && amountStr !== "") rowErrors.push("Amount (invalid number)");
    if (amount === null && amountStr === "" && !rowErrors.includes("Amount (invalid number)"))
      rowErrors.push("Amount (missing)");

    if (rowErrors.length > 0) {
      errors.push({
        row: rowIndex,
        message: `Row ${rowIndex}: Missing or invalid required value for ${rowErrors.join(", ")}`,
        field: rowErrors[0],
      });
      continue;
    }

    const total = amount ?? 0;
    const quantity = 1;
    const unitAmount = total;
    // TODO: Optional: make AccountCode/TaxType configurable per-org or via env.
    const accountCode = "";
    const taxType = "None";

    const xeroRow: XeroBillRow = [
      contactName,
      "", // EmailAddress
      "", "", "", "", "", "", "", "", // PO address
      issueKey,
      invoiceDate!,
      dueDate!,
      total,
      "", // InventoryItemCode
      summary,
      quantity,
      unitAmount,
      accountCode,
      taxType,
      "", // TaxAmount
      "", "", "", "", // Tracking
      currency || "",
    ];
    rows.push(xeroRow);
  }

  return { rows, errors };
}
