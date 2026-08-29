import * as XLSX from "xlsx";

export interface RawEmiratesRow {
  flightDate: string;
  aircraftType: string;
  flightNumber: string;
  aircraftRegistration: string;
  from: string;
  to: string;
  atd: string;
  ata: string;
  block: string;
  landing: string;
  crewName: string;
}

const HEADER_MARKER = "Flight Date";

export async function parseEmiratesFile(file: File): Promise<RawEmiratesRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  const headerIndex = rows.findIndex((row) => row[0] === HEADER_MARKER);
  if (headerIndex === -1) {
    throw new Error("Could not find the Emirates report's column headers in this file");
  }

  const dataRows = rows.slice(headerIndex + 1).filter((row) => row[0]);

  return dataRows.map((row) => ({
    flightDate: String(row[0] ?? ""),
    aircraftType: String(row[1] ?? ""),
    flightNumber: String(row[2] ?? ""),
    aircraftRegistration: String(row[3] ?? ""),
    from: String(row[4] ?? ""),
    to: String(row[5] ?? ""),
    atd: String(row[6] ?? ""),
    ata: String(row[7] ?? ""),
    block: String(row[8] ?? ""),
    landing: String(row[11] ?? ""),
    crewName: String(row[13] ?? "")
  }));
}
