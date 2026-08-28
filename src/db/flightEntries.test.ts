import { beforeEach, describe, expect, it } from "vitest";
import { LogbookDatabase } from "./db";
import { addFlightEntry, deleteFlightEntry, getAllFlightEntries, updateFlightEntry } from "./flightEntries";
import type { FlightEntry } from "../types/flightEntry";

const sampleEntry: FlightEntry = {
  date: "2026-08-20",
  departure: "OMDB",
  arrival: "EGLL",
  aircraftType: "B777",
  aircraftRegistration: "A6-EXAMPLE",
  blockOffTime: "08:00",
  blockOnTime: "15:30",
  totalTimeMinutes: 450,
  role: "PIC",
  dayTimeMinutes: 450,
  nightTimeMinutes: 0,
  ifrTimeMinutes: 450,
  vfrTimeMinutes: 0,
  crossCountryTimeMinutes: 450,
  landingsDay: 1,
  landingsNight: 0,
  approaches: "ILS x1",
  remarks: "Test flight"
};

describe("flight entry CRUD", () => {
  let db: LogbookDatabase;

  beforeEach(async () => {
    db = new LogbookDatabase(`flightEntries-test-db-${Math.random()}`);
    await db.open();
  });

  it("adds and retrieves a flight entry", async () => {
    await addFlightEntry(db, sampleEntry);
    const entries = await getAllFlightEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ departure: "OMDB", arrival: "EGLL" });
  });

  it("updates a flight entry", async () => {
    const id = await addFlightEntry(db, sampleEntry);
    await updateFlightEntry(db, id, { remarks: "Updated remarks" });
    const entries = await getAllFlightEntries(db);
    expect(entries[0].remarks).toBe("Updated remarks");
  });

  it("deletes a flight entry", async () => {
    const id = await addFlightEntry(db, sampleEntry);
    await deleteFlightEntry(db, id);
    const entries = await getAllFlightEntries(db);
    expect(entries).toHaveLength(0);
  });
});
