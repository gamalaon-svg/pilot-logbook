import type { LogbookDatabase } from "./db";
import type { FlightEntry } from "../types/flightEntry";

export async function addFlightEntry(db: LogbookDatabase, entry: FlightEntry): Promise<number> {
  return db.flightEntries.add(entry);
}

export async function getAllFlightEntries(db: LogbookDatabase): Promise<FlightEntry[]> {
  return db.flightEntries.orderBy("date").toArray();
}

export async function updateFlightEntry(
  db: LogbookDatabase,
  id: number,
  changes: Partial<FlightEntry>
): Promise<void> {
  await db.flightEntries.update(id, changes);
}

export async function deleteFlightEntry(db: LogbookDatabase, id: number): Promise<void> {
  await db.flightEntries.delete(id);
}
