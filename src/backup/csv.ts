import type { FlightEntry } from "../types/flightEntry";

const HEADER = [
  "date",
  "departure",
  "arrival",
  "aircraftType",
  "aircraftRegistration",
  "blockOffTime",
  "blockOnTime",
  "totalTimeMinutes",
  "role",
  "dayTimeMinutes",
  "nightTimeMinutes",
  "ifrTimeMinutes",
  "vfrTimeMinutes",
  "crossCountryTimeMinutes",
  "landingsDay",
  "landingsNight",
  "approaches",
  "remarks"
] as const satisfies readonly (keyof FlightEntry)[];

const NUMERIC_FIELDS = new Set<string>([
  "totalTimeMinutes",
  "dayTimeMinutes",
  "nightTimeMinutes",
  "ifrTimeMinutes",
  "vfrTimeMinutes",
  "crossCountryTimeMinutes",
  "landingsDay",
  "landingsNight"
]);

export class CsvFormatError extends Error {}

function csvField(value: string | number): string {
  const str = String(value);
  if (/["\n,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function flightEntriesToCsv(entries: FlightEntry[]): string {
  const lines = [HEADER.join(",")];
  for (const entry of entries) {
    lines.push(HEADER.map((key) => csvField(entry[key])).join(","));
  }
  return lines.join("\n");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseFlightEntriesCsv(text: string): FlightEntry[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    throw new CsvFormatError("CSV file is empty");
  }
  const header = rows[0];
  const headerMatches = header.length === HEADER.length && header.every((value, i) => value === HEADER[i]);
  if (!headerMatches) {
    throw new CsvFormatError("CSV header does not match the expected logbook backup format");
  }
  return rows.slice(1).map((row, rowIndex) => {
    if (row.length !== HEADER.length) {
      throw new CsvFormatError(`Row ${rowIndex + 1} has ${row.length} fields, expected ${HEADER.length}`);
    }
    const entry = {} as Record<string, string | number>;
    HEADER.forEach((key, i) => {
      const raw = row[i];
      entry[key] = NUMERIC_FIELDS.has(key) ? Number(raw) : raw;
    });
    return entry as unknown as FlightEntry;
  });
}
