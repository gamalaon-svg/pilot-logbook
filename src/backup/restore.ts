import type { LogbookDatabase } from "../db/db";
import type { FlightEntry } from "../types/flightEntry";
import { parseFlightEntriesCsv } from "./csv";

export async function readAndParseBackupFile(file: File): Promise<FlightEntry[]> {
  const text = await file.text();
  return parseFlightEntriesCsv(text);
}

export async function replaceAllFlightEntries(db: LogbookDatabase, entries: FlightEntry[]): Promise<void> {
  await db.transaction("rw", db.flightEntries, async () => {
    await db.flightEntries.clear();
    await db.flightEntries.bulkAdd(entries);
  });
}
