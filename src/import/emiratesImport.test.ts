// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { LogbookDatabase } from "../db/db";
import { getAllFlightEntries } from "../db/flightEntries";
import { commitEmiratesImport, prepareEmiratesImport } from "./emiratesImport";

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

describe("prepareEmiratesImport / commitEmiratesImport", () => {
  it("adds all flights as new on a first import into an empty logbook", async () => {
    const db = new LogbookDatabase(`emirates-import-test-db-${Math.random()}`);
    await db.open();
    const file = makeEmiratesFile([sampleRow]);

    const preview = await prepareEmiratesImport(db, file, "406191");
    expect(preview.newEntries).toHaveLength(1);
    expect(preview.duplicateCount).toBe(0);
    expect(preview.totalInFile).toBe(1);

    await commitEmiratesImport(db, preview.newEntries);
    const stored = await getAllFlightEntries(db);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ date: "2011-05-26", departure: "DXB", arrival: "BAH" });
  });

  it("skips a flight that's already been imported", async () => {
    const db = new LogbookDatabase(`emirates-import-test-db-${Math.random()}`);
    await db.open();
    const file = makeEmiratesFile([sampleRow]);

    const firstPreview = await prepareEmiratesImport(db, file, "406191");
    await commitEmiratesImport(db, firstPreview.newEntries);

    const secondPreview = await prepareEmiratesImport(db, file, "406191");
    expect(secondPreview.newEntries).toHaveLength(0);
    expect(secondPreview.duplicateCount).toBe(1);

    const stored = await getAllFlightEntries(db);
    expect(stored).toHaveLength(1);
  });
});
