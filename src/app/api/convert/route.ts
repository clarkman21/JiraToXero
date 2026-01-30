import { NextRequest, NextResponse } from "next/server";
import { parseCsvWithHeaders } from "@/lib/csv";
import {
  jiraToXero,
  XERO_BILL_HEADER,
  type ConversionDefaults,
} from "@/lib/jiraToXero";
import { serializeCsv } from "@/lib/csv";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function parseDefaults(raw: unknown): ConversionDefaults | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  let quantity: number | undefined;
  if (typeof o.quantity === "number" && Number.isInteger(o.quantity)) {
    quantity = o.quantity;
  } else if (typeof o.quantity === "string") {
    const n = parseInt(o.quantity, 10);
    if (Number.isInteger(n)) quantity = n;
  }
  return {
    taxType: typeof o.taxType === "string" ? o.taxType : undefined,
    accountCode: typeof o.accountCode === "string" ? o.accountCode : undefined,
    quantity,
  };
}

export async function POST(request: NextRequest) {
  try {
    let csvRaw: string;
    let defaults: ConversionDefaults | undefined;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (body.csv == null) {
        return NextResponse.json(
          { success: false, errors: [{ row: 0, message: "No file provided" }] },
          { status: 400 }
        );
      }
      csvRaw = typeof body.csv === "string" ? body.csv : "";
      defaults = parseDefaults(body.defaults);
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { success: false, errors: [{ row: 0, message: "No file provided" }] },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            errors: [
              {
                row: 0,
                message: "File is too large (max 2MB)",
              },
            ],
          },
          { status: 400 }
        );
      }
      csvRaw = await file.text();
      const defaultsStr = formData.get("defaults");
      if (typeof defaultsStr === "string") {
        try {
          defaults = parseDefaults(JSON.parse(defaultsStr));
        } catch {
          /* ignore */
        }
      }
    } else {
      const text = await request.text();
      if (!text.trim()) {
        return NextResponse.json(
          { success: false, errors: [{ row: 0, message: "No file provided" }] },
          { status: 400 }
        );
      }
      csvRaw = text;
    }

    if (csvRaw.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          errors: [{ row: 0, message: "File is too large (max 2MB)" }],
        },
        { status: 400 }
      );
    }

    let headers: string[];
    let dataRows: string[][];
    try {
      const parsed = parseCsvWithHeaders(csvRaw);
      headers = parsed.headers;
      dataRows = parsed.rows;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "File is not a valid CSV";
      return NextResponse.json(
        { success: false, errors: [{ row: 0, message: msg }] },
        { status: 400 }
      );
    }

    const { rows, errors } = jiraToXero(headers, dataRows, defaults);

    if (errors.length > 0 && rows.length === 0) {
      return NextResponse.json(
        { success: false, errors, xeroCsv: null },
        { status: 200 }
      );
    }

    const xeroCsv = serializeCsv([...XERO_BILL_HEADER], rows);

    return NextResponse.json({
      success: true,
      xeroCsv,
      errors: errors.length > 0 ? errors : undefined,
      rowCount: rows.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Conversion failed";
    return NextResponse.json(
      { success: false, errors: [{ row: 0, message: msg }] },
      { status: 500 }
    );
  }
}
