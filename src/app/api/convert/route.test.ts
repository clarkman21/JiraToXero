import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

const FIXTURE_CSV = `Summary,Issue key,Issue id,Created,Resolved,Due date,Custom field (Amount),Custom field (Currency),Custom field (Vendor to be paid),Custom field (Payment details)
Valid One,SBD-101,1,29/Jan/26 12:09 PM,30/Jan/26 11:38 AM,30/Jan/26,100.50,RWF,Vendor A,
Invalid Row,SBD-102,2,30/Jan/26,30/Jan/26,,,RWF,Vendor B,
Valid Two,SBD-103,3,28/Jan/26 2:56 PM,28/Jan/26,28/Jan/26,250,RWF,Huza HR,
`;

describe("POST /api/convert", () => {
  it("returns 400 when no file provided (JSON)", async () => {
    const req = new NextRequest("http://localhost/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].message).toContain("No file provided");
  });

  it("returns 200 with xeroCsv and errors for fixture (2 valid, 1 invalid)", async () => {
    const req = new NextRequest("http://localhost/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: FIXTURE_CSV }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.xeroCsv).toBeDefined();
    expect(data.xeroCsv).toContain("*ContactName");
    expect(data.rowCount).toBe(2);
    const lines = (data.xeroCsv as string).trim().split("\n");
    expect(lines.length).toBe(3);
    const headerCols = lines[0].split(",").length;
    const firstRowCols = lines[1].split(",").length;
    expect(headerCols).toBe(26);
    expect(firstRowCols).toBe(26);
    expect(data.errors).toBeDefined();
    expect(data.errors.length).toBeGreaterThanOrEqual(1);
    const invalidRowError = data.errors.find(
      (e: { message: string }) => e.message.includes("Row 2") && e.message.includes("Amount")
    );
    expect(invalidRowError).toBeDefined();
  });

  it("returns 400 for invalid/empty CSV", async () => {
    const req = new NextRequest("http://localhost/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.errors).toHaveLength(1);
  });
});
