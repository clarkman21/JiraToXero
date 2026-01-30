import { describe, it, expect } from "vitest";
import {
  jiraToXero,
  parseJiraDate,
  XERO_BILL_HEADER,
} from "./jiraToXero";

describe("parseJiraDate", () => {
  it("parses DD/MMM/YY style", () => {
    expect(parseJiraDate("29/Jan/26 12:09 PM")).toBe("2026-01-29");
    expect(parseJiraDate("28/Jan/26")).toBe("2026-01-28");
  });
  it("returns null for empty or invalid", () => {
    expect(parseJiraDate("")).toBe(null);
    expect(parseJiraDate("not-a-date")).toBe(null);
  });
});

describe("jiraToXero", () => {
  const minimalHeaders = [
    "Summary",
    "Issue key",
    "Created",
    "Resolved",
    "Due date",
    "Custom field (Amount)",
    "Custom field (Currency)",
    "Custom field (Vendor to be paid)",
    "Custom field (Payment details)",
  ];

  it("returns header error when required columns missing", () => {
    const result = jiraToXero(["Only", "Two"], [["a", "b"]]);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Required Jira columns not found");
  });

  it("maps one valid row to Xero format with correct date and amount", () => {
    const headers = minimalHeaders;
    const rows = [
      [
        "Test Payment",
        "SBD-123",
        "29/Jan/26 12:09 PM",
        "30/Jan/26 11:38 AM",
        "30/Jan/26 11:38 AM",
        "14644.0",
        "Rwf",
        "Acme Ltd",
        "Account Name: Acme Ltd",
      ],
    ];
    const result = jiraToXero(headers, rows);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row[0]).toBe("Acme Ltd");
    expect(row[10]).toBe("SBD-123");
    expect(row[11]).toBe("2026-01-30");
    expect(row[12]).toBe("2026-01-30");
    expect(row[13]).toBe(14644);
    expect(row[15]).toBe("Test Payment");
    expect(row[16]).toBe(1);
    expect(row[17]).toBe(14644);
    expect(row[25]).toBe("Rwf");
  });

  it("uses first occurrence of duplicate column names for Amount", () => {
    const headers = [
      "Summary",
      "Issue key",
      "Created",
      "Resolved",
      "Due date",
      "Custom field (Amount)",
      "Custom field (Amount)",
      "Custom field (Currency)",
      "Custom field (Vendor to be paid)",
      "Custom field (Payment details)",
    ];
    const rows = [
      [
        "Pay",
        "SBD-1",
        "01/Feb/26 10:00 AM",
        "02/Feb/26",
        "02/Feb/26",
        "100",
        "999",
        "RWF",
        "Vendor A",
        "",
      ],
    ];
    const result = jiraToXero(headers, rows);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][13]).toBe(100);
    expect(result.rows[0][17]).toBe(100);
  });

  it("falls back to Account Name from Payment details for ContactName", () => {
    const headers = minimalHeaders;
    const rows = [
      [
        "Fee",
        "SBD-2",
        "01/Jan/26 9:00 AM",
        "01/Jan/26",
        "01/Jan/26",
        "5000",
        "Rwf",
        "",
        "Account Name: Huza HR Ltd\nAccount Number: 123",
      ],
    ];
    const result = jiraToXero(headers, rows);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe("Huza HR Ltd");
  });

  it("falls back to Name : from Payment details for ContactName (Jira format)", () => {
    const headers = minimalHeaders;
    const rows = [
      [
        "Reimbursement",
        "SBD-3",
        "29/Jan/26 12:09 PM",
        "30/Jan/26",
        "30/Jan/26",
        "14644",
        "Rwf",
        "",
        "Name : Norbert Mugwaneza\n\nPhone : 0788667519",
      ],
    ];
    const result = jiraToXero(headers, rows);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe("Norbert Mugwaneza");
  });

  it("reports invalid row and skips it", () => {
    const headers = minimalHeaders;
    const rows = [
      [
        "Valid",
        "SBD-1",
        "01/Jan/26 9:00 AM",
        "01/Jan/26",
        "01/Jan/26",
        "100",
        "RWF",
        "Vendor",
        "",
      ],
      [
        "No amount",
        "SBD-2",
        "02/Jan/26",
        "02/Jan/26",
        "02/Jan/26",
        "",
        "RWF",
        "Vendor",
        "",
      ],
      [
        "Bad date",
        "SBD-3",
        "not-a-date",
        "",
        "",
        "50",
        "RWF",
        "Vendor",
        "",
      ],
    ];
    const result = jiraToXero(headers, rows);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][10]).toBe("SBD-1");
    expect(result.errors).toHaveLength(2);
    const errMessages = result.errors.map((e) => e.message);
    expect(errMessages.some((m) => m.includes("Row 2") && m.includes("Amount"))).toBe(true);
    expect(errMessages.some((m) => m.includes("Row 3") && m.includes("InvoiceDate"))).toBe(true);
  });

  it("outputs Xero header columns in expected order", () => {
    const result = jiraToXero(minimalHeaders, []);
    expect([...XERO_BILL_HEADER]).toEqual([
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
    ]);
  });
});
