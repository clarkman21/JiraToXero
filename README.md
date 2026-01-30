# Jira to Xero Bills Converter

Convert a Jira Service Desk payment CSV export to the Xero Bills import template format.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload your Jira CSV, click **Convert**, then **Download Xero CSV** if conversion succeeded.

## Deploy to Vercel

- Push the repo to GitHub and import the project in [Vercel](https://vercel.com). Next.js is auto-detected.
- Or use the Vercel CLI: `vercel` from the project root.

## Usage

1. Export payments from Jira (e.g. filter for “Payment request with approval” and export as CSV).
2. Upload the CSV on this app.
3. Fix any reported row errors in your Jira data if needed, then re-export and convert again.
4. Download the generated CSV and import it in Xero (Bills → Import).

## Config (editable mapping)

Mapping and defaults are read from **`src/config/mapping.json`**. Edit this file to change Jira ↔ Xero column mapping without touching code.

- **`requiredJiraColumns`**: Jira columns that must exist in the CSV.
- **`xeroHeader`**: Xero Bills import column order (do not reorder unless you know the Xero template).
- **`mappingFields`**: For each Xero column, list Jira source columns in priority order. Optional **`type`**: `"date"`, `"amount"`, or `"contact"` (affects parsing).
- **`jiraTemplateColumnOrder`**: Column order for the downloadable Jira template.
- **`defaultTaxTypes`**, **`defaultQuantityOptions`**, **`defaultAccountCodes`**: Options for the UI dropdowns.

After editing the config, restart the dev server or rebuild.

## Mapping (default)

- **ContactName**: Jira “Vendor to be paid” or “Supplier / Vendor”, or “Account Name” from Payment details.
- **InvoiceNumber**: Jira Issue key (e.g. SBD-7603).
- **InvoiceDate** / **DueDate**: Jira Created / Resolved or Due date (converted to YYYY-MM-DD).
- **Total** / **UnitAmount**: Jira Amount (first “Custom field (Amount)” column).
- **Description**: Jira Summary.
- **AccountCode** / **TaxType**: Left empty or “None”; you can set them in Xero after import or configure later in the app.

## Tests

```bash
npm run test
```

## Limits

- CSV file size is limited to 2 MB.
