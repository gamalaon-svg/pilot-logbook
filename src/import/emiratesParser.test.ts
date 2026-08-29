// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseEmiratesFile } from "./emiratesParser";

function makeEmiratesFile(rows: unknown[][]): File {
  const preamble = [
    ["Flight Time Report"],
    ["CA - GAMAL OUN #406191"],
    ["From:", "26-Oct-2010"],
    ["To:", "28-Aug-2026"]
  ];
  const columnHeader = [
    "Flight Date",
    "A/C Type",
    "Flt No",
    "A/C Reg",
    "From",
    "To",
    "ATD",
    "ATA",
    "Block",
    "Stick",
    "Take off",
    "Landing",
    "SDC",
    "Crew Name",
    "DE Time"
  ];
  const sheet = XLSX.utils.aoa_to_sheet([...preamble, [], columnHeader, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "CrewLogReports");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer], "CrewLogReports.xlsx");
}

const sampleRow = [
  "26-MAY-2011",
  "A33",
  "0839",
  "A6EAR",
  "DXB",
  "BAH",
  "12:28",
  "13:39",
  "1:11",
  "1:11",
  "",
  "",
  "O",
  "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)",
  ""
];

describe("parseEmiratesFile", () => {
  it("skips the report header and parses data rows", async () => {
    const file = makeEmiratesFile([sampleRow]);

    const rows = await parseEmiratesFile(file);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      flightDate: "26-MAY-2011",
      aircraftType: "A33",
      flightNumber: "0839",
      aircraftRegistration: "A6EAR",
      from: "DXB",
      to: "BAH",
      atd: "12:28",
      ata: "13:39",
      block: "1:11",
      landing: "",
      crewName: "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)"
    });
  });

  it("throws when the file doesn't look like an Emirates report", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([["not", "the", "right", "format"]]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const file = new File([buffer], "random.xlsx");

    await expect(parseEmiratesFile(file)).rejects.toThrow(/could not find/i);
  });
});
