import type { LogbookDatabase } from "../db/db";
import { addFlightEntry, getAllFlightEntries, updateFlightEntry } from "../db/flightEntries";
import type { FlightEntry } from "../types/flightEntry";
import { parseEmiratesFile } from "./emiratesParser";
import { mapEmiratesRow } from "./emiratesMapping";

function fingerprint(entry: FlightEntry): string {
  return [entry.date, entry.departure, entry.arrival, entry.blockOffTime].join("|");
}

export interface EntryUpdate {
  id: number;
  updates: Partial<FlightEntry>;
}

export interface EmiratesImportPreview {
  newEntries: FlightEntry[];
  entriesToUpdate: EntryUpdate[];
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
  const existingByFingerprint = new Map(existingEntries.map((entry) => [fingerprint(entry), entry]));

  const newEntries: FlightEntry[] = [];
  const entriesToUpdate: EntryUpdate[] = [];
  let duplicateCount = 0;

  for (const mapped of mappedEntries) {
    const existing = existingByFingerprint.get(fingerprint(mapped));
    if (!existing) {
      newEntries.push(mapped);
      continue;
    }
    if (!existing.crew && existing.id !== undefined) {
      entriesToUpdate.push({
        id: existing.id,
        updates: { crew: mapped.crew, airline: mapped.airline, flightNumber: mapped.flightNumber }
      });
    } else {
      duplicateCount += 1;
    }
  }

  return { newEntries, entriesToUpdate, duplicateCount, totalInFile: mappedEntries.length };
}

export async function commitEmiratesImport(
  db: LogbookDatabase,
  newEntries: FlightEntry[],
  entriesToUpdate: EntryUpdate[] = []
): Promise<void> {
  for (const entry of newEntries) {
    await addFlightEntry(db, entry);
  }
  for (const { id, updates } of entriesToUpdate) {
    await updateFlightEntry(db, id, updates);
  }
}
