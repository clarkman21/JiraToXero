"use client";

import { useState, useRef } from "react";
import {
  MAPPING_FIELDS,
  XERO_BILL_HEADER,
  getJiraTemplateColumns,
  DEFAULT_TAX_TYPES,
  DEFAULT_QUANTITY_OPTIONS,
  DEFAULT_ACCOUNT_CODES,
} from "@/lib/mappingConfig";
import { serializeCsv } from "@/lib/csv";

interface ConversionError {
  row: number;
  message: string;
  field?: string;
}

interface ConvertResponse {
  success: boolean;
  xeroCsv?: string | null;
  errors?: ConversionError[];
  rowCount?: number;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [mappingOpen, setMappingOpen] = useState(true);
  const [defaultTaxType, setDefaultTaxType] = useState<string>("None");
  const [defaultQuantity, setDefaultQuantity] = useState<number>(1);
  const [defaultAccountCode, setDefaultAccountCode] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setResult(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "defaults",
        JSON.stringify({
          taxType: defaultTaxType,
          accountCode: defaultAccountCode || undefined,
          quantity: defaultQuantity,
        })
      );
      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });
      const data: ConvertResponse = await res.json();
      setResult(data);
    } catch (e) {
      setResult({
        success: false,
        errors: [
          {
            row: 0,
            message: e instanceof Error ? e.message : "Request failed",
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXeroCsv = () => {
    if (!result?.xeroCsv) return;
    downloadCsv(result.xeroCsv, "Bills-Xero.csv");
  };

  const handleDownloadXeroTemplate = () => {
    const csv = serializeCsv([...XERO_BILL_HEADER], []);
    downloadCsv(csv, "BillTemplate.csv");
  };

  const handleDownloadJiraTemplate = () => {
    const columns = getJiraTemplateColumns();
    const csv = serializeCsv(columns, []);
    downloadCsv(csv, "JiraExportTemplate.csv");
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900">
        Jira to Xero Bills Converter
      </h1>
      <p className="mt-2 text-gray-600">
        Upload a Jira Service Desk payment CSV to convert to Xero Bills import format.
      </p>

      {/* Templates */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Templates</h2>
        <p className="text-sm text-gray-600 mb-3">
          Download the expected formats to match your Jira export and Xero Bills import.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownloadJiraTemplate}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
          >
            Download Jira template
          </button>
          <button
            type="button"
            onClick={handleDownloadXeroTemplate}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
          >
            Download Xero template
          </button>
        </div>
      </div>

      {/* Defaults */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Default values</h2>
        <p className="text-sm text-gray-600 mb-3">
          Used for fields not mapped from Jira. Unit amount is set from the amount (Total).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="default-tax" className="block text-xs font-medium text-gray-700 mb-1">
              *TaxType
            </label>
            <select
              id="default-tax"
              value={defaultTaxType}
              onChange={(e) => setDefaultTaxType(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {DEFAULT_TAX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || "(empty)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="default-quantity" className="block text-xs font-medium text-gray-700 mb-1">
              *Quantity
            </label>
            <select
              id="default-quantity"
              value={defaultQuantity}
              onChange={(e) => setDefaultQuantity(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {DEFAULT_QUANTITY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="default-account" className="block text-xs font-medium text-gray-700 mb-1">
              *AccountCode
            </label>
            <select
              id="default-account"
              value={defaultAccountCode}
              onChange={(e) => setDefaultAccountCode(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {DEFAULT_ACCOUNT_CODES.map((c) => (
                <option key={c || "empty"} value={c}>
                  {c || "(empty)"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Field mapping */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <button
          type="button"
          onClick={() => setMappingOpen(!mappingOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-sm font-medium text-gray-900">Field mapping</h2>
          <span className="text-gray-500">{mappingOpen ? "▼" : "▶"}</span>
        </button>
        {mappingOpen && (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                    Xero column
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                    Jira source(s)
                  </th>
                </tr>
              </thead>
              <tbody>
                {MAPPING_FIELDS.map((field, i) => {
                  let source: string;
                  if (field.jiraSources.length > 0) {
                    source = field.jiraSources.join(" → ");
                  } else if (field.xeroColumn === "*Quantity") {
                    source = `Default: ${defaultQuantity}`;
                  } else if (field.xeroColumn === "*UnitAmount") {
                    source = "Default: = Amount";
                  } else if (field.xeroColumn === "*TaxType") {
                    source = `Default: ${defaultTaxType}`;
                  } else if (field.xeroColumn === "*AccountCode") {
                    source = defaultAccountCode ? `Default: ${defaultAccountCode}` : "Default: (empty)";
                  } else {
                    source = "—";
                  }
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-900 whitespace-nowrap">
                        {field.xeroColumn}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {source}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Convert */}
      <div className="mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-gray-900">Convert</h2>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
          <button
            type="button"
            onClick={handleConvert}
            disabled={!file || loading}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? "Converting…" : "Convert"}
          </button>
        </div>

        {result && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            {result.success ? (
              <>
                <p className="text-sm text-gray-700">
                  Converted <strong>{result.rowCount ?? 0}</strong> row
                  {(result.rowCount ?? 0) !== 1 ? "s" : ""}.
                  {result.errors && result.errors.length > 0 && (
                    <span className="block mt-2 text-amber-700">
                      {result.errors.length} row
                      {result.errors.length !== 1 ? "s" : ""} had errors and were skipped.
                    </span>
                  )}
                </p>
                {result.xeroCsv && (
                  <button
                    type="button"
                    onClick={handleDownloadXeroCsv}
                    className="mt-3 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800"
                  >
                    Download Xero CSV
                  </button>
                )}
              </>
            ) : null}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
