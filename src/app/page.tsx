"use client";

import { useState, useRef } from "react";

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

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConvertResponse | null>(null);
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

  const handleDownload = () => {
    if (!result?.xeroCsv) return;
    const blob = new Blob([result.xeroCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Bills-Xero.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900">
        Jira to Xero Bills Converter
      </h1>
      <p className="mt-2 text-gray-600">
        Upload a Jira Service Desk payment CSV to convert to Xero Bills import format.
      </p>

      <div className="mt-6 flex flex-col gap-4">
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
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={handleDownload}
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
