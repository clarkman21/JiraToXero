# Jira to Xero Bills Converter

Convert a Jira Service Desk payment CSV export to the Xero Bills import template format.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload your Jira CSV, click **Convert**, then **Download Xero CSV** if conversion succeeded.

## Deploy to Vercel

### Prerequisites

- Node.js 18+ and npm
- A [Vercel](https://vercel.com) account
- Git (for dashboard deploy) or [Vercel CLI](https://vercel.com/docs/cli) (optional)

### Option 1: Deploy via Vercel Dashboard (recommended)

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new) and sign in.
3. **Import** your repository. Vercel will detect Next.js automatically.
4. Leave the defaults:
   - **Build Command:** `npm run build` (or `next build`)
   - **Output Directory:** (auto for Next.js)
   - **Install Command:** `npm install`
5. Click **Deploy**. Your app will be live at `https://<your-project>.vercel.app`.

### Option 2: Deploy via Vercel CLI

1. Install the CLI: `npm i -g vercel`
2. From the project root, run:

```bash
npm install
npm run build
vercel
```

3. Follow the prompts (link to existing project or create new). Use `vercel --prod` to deploy to production after the first deploy.

### Build and start commands (reference)

| Command        | Description                |
|----------------|----------------------------|
| `npm install`  | Install dependencies      |
| `npm run build`| Build for production       |
| `npm run start`| Run production build      |
| `npm run dev`  | Run dev server             |

The project includes a `vercel.json` with `"framework": "nextjs"` so Vercel uses the correct settings. No environment variables are required for basic use.

### Troubleshooting: "No Next.js version detected"

- **Root Directory:** In Vercel → Project → **Settings** → **General**, set **Root Directory** to `.` or leave it **empty** so Vercel uses the repo root where `package.json` (with `next` in dependencies) lives. If this is set to a subfolder that has no `package.json`, the build will fail.
- **Commit `package.json`:** Ensure `package.json` and `package-lock.json` are committed and pushed so Vercel sees `"next": "14.2.0"` in dependencies.

### Troubleshooting: "npm install" exited with 254

- The project uses **`npm ci`** in `vercel.json` (installCommand) for a reproducible install; ensure **`package-lock.json`** is committed.
- **Node version** is pinned to **20.x** in `package.json` (`engines.node`). If 254 persists, try Node **22.x** in Vercel → Settings → General → Node.js Version, or set `"node": "22.x"` in `engines`.

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
