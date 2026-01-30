/**
 * CSV parse (handles quoted fields and newlines) and serialize for Xero.
 * No Jira-specific logic.
 */

/**
 * Parse a CSV string into an array of rows (each row is an array of cell strings).
 * Handles quoted fields and newlines inside quotes per RFC 4180.
 */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const nextCh = csv[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
      continue;
    }

    switch (ch) {
      case '"':
        inQuotes = true;
        break;
      case ",":
        currentRow.push(currentCell);
        currentCell = "";
        break;
      case "\n":
      case "\r":
        if (ch === "\r" && nextCh === "\n") i++;
        currentRow.push(currentCell);
        currentCell = "";
        rows.push(currentRow);
        currentRow = [];
        break;
      default:
        currentCell += ch;
    }
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

/**
 * Get header row and data rows from parsed CSV.
 * Returns { headers, rows } or throws if empty.
 */
const BOM = "\uFEFF";

export function parseCsvWithHeaders(csv: string): { headers: string[]; rows: string[][] } {
  const trimmed = csv.trim();
  if (!trimmed) throw new Error("CSV is empty");
  const withoutBom = csv.startsWith(BOM) ? csv.slice(BOM.length) : csv;
  const all = parseCsv(withoutBom);
  if (all.length === 0) throw new Error("CSV is empty");
  const headers = all[0].map((h) => h.trim());
  const rows = all.slice(1);
  return { headers, rows };
}

/**
 * Escape a cell for CSV: wrap in quotes and escape internal quotes.
 */
function escapeCell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Serialize rows to CSV string. First row is treated as header.
 * Each row is an array of cell values (strings or numbers).
 */
export function serializeCsv(header: string[], dataRows: (string | number)[][]): string {
  const headerLine = header.map(escapeCell).join(",");
  const dataLines = dataRows.map((row) =>
    row.map((cell) => escapeCell(String(cell ?? ""))).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}
