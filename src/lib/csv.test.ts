import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvWithHeaders, serializeCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    const csv = "a,b,c\n1,2,3\nx,y,z";
    expect(parseCsv(csv)).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["x", "y", "z"],
    ]);
  });

  it("handles quoted fields", () => {
    const csv = '"hello","world"';
    expect(parseCsv(csv)).toEqual([["hello", "world"]]);
  });

  it("handles newlines inside quoted fields", () => {
    const csv = 'a,"b\nc",d';
    expect(parseCsv(csv)).toEqual([["a", "b\nc", "d"]]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = '"say ""hi""",x';
    expect(parseCsv(csv)).toEqual([['say "hi"', "x"]]);
  });

  it("handles empty cells", () => {
    const csv = "a,,c\n,2,";
    expect(parseCsv(csv)).toEqual([
      ["a", "", "c"],
      ["", "2", ""],
    ]);
  });

  it("handles CRLF", () => {
    const csv = "a,b\r\n1,2";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvWithHeaders", () => {
  it("returns headers and data rows", () => {
    const csv = "Name,Age\nAlice,30\nBob,25";
    const { headers, rows } = parseCsvWithHeaders(csv);
    expect(headers).toEqual(["Name", "Age"]);
    expect(rows).toEqual([
      ["Alice", "30"],
      ["Bob", "25"],
    ]);
  });

  it("throws on empty CSV", () => {
    expect(() => parseCsvWithHeaders("")).toThrow("CSV is empty");
  });
});

describe("serializeCsv", () => {
  it("outputs header and data with correct escaping", () => {
    const header = ["A", "B", "C"];
    const data = [
      ["1", "2", "3"],
      ["x", "y", "z"],
    ];
    expect(serializeCsv(header, data)).toBe("A,B,C\n1,2,3\nx,y,z");
  });

  it("escapes commas and quotes", () => {
    const header = ["Col"];
    const data = [['a,b'], ['say "hi"']];
    expect(serializeCsv(header, data)).toBe('Col\n"a,b"\n"say ""hi"""');
  });

  it("escapes newlines in cells", () => {
    const header = ["Col"];
    const data = [["line1\nline2"]];
    expect(serializeCsv(header, data)).toBe('Col\n"line1\nline2"');
  });

  it("accepts numbers", () => {
    const header = ["N"];
    const data = [[42], [3.14]];
    expect(serializeCsv(header, data)).toBe("N\n42\n3.14");
  });
});
