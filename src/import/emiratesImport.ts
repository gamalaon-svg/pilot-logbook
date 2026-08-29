import type { LogbookDatabase } from "../db/db";
import { addFlightEntry, getAllFlightEntries } from "../db/flightEntries";
import type { FlightEntry } from "../types/flightEntry";
import { parseEmiratesFile } from "./emiratesParser";
import { mapEmiratesRow } from "./emiratesMapping";

function fingerprint(entry: FlightEntry): string {
  return [entry.date, entry.departure, entry.arrival, entry.blockOffTime, entry.flightNumber ?? ""].join("|");
}

export interface EmiratesImportPreview {
  newEntries: FlightEntry[];
  duplicateCount: number;
  totalInFile: number;
}

export async function prepareEmiratesImport(
  db: LogbookDatabase,
  file: File,
  pilotLicenseNumber: string
): Promise<EmiratesImportPreview> {
  const rawRows = await parseEmiratesFile(file);
  const mappedEntries = rawRows.map((row) => mapEmiratesRow(row, { pilotLicenseNumber }));

  const existingEntries = await getAllFlightEntries(db);
  const existingFingerprints = new Set(existingEntries.map(fingerprint));

  const newEntries = mappedEntries.filter((entry) => !existingFingerprints.has(fingerprint(entry)));
  const duplicateCount = mappedEntries.length - newEntries.length;

  return { newEntries, duplicateCount, totalInFile: mappedEntries.length };
}

export async function commitEmiratesImport(db: LogbookDatabase, newEntries: FlightEntry[]): Promise<void> {
  for (const entry of newEntries) {
    await addFlightEntry(db, entry);
  }
}
