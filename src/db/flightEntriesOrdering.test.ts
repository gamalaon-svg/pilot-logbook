import { describe, expect, it } from "vitest";
import { LogbookDatabase } from "./db";
import { getAllFlightEntries } from "./flightEntries";
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

describe("flight entry ordering", () => {
  it("returns entries ordered by date", async () => {
    const db = new LogbookDatabase(`flightEntries-ordering-test-db-${Math.random()}`);
    await db.open();
    await db.flightEntries.bulkAdd([
      { ...sampleEntry, date: "2026-08-22" },
      { ...sampleEntry, date: "2026-08-19" }
    ]);
    const entries = await getAllFlightEntries(db);
    expect(entries.map((e) => e.date)).toEqual(["2026-08-19", "2026-08-22"]);
  });
});
