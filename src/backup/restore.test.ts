// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LogbookDatabase } from "../db/db";
import { getAllFlightEntries } from "../db/flightEntries";
import { CsvFormatError, flightEntriesToCsv } from "./csv";
import { readAndParseBackupFile, replaceAllFlightEntries } from "./restore";
import type { FlightEntry } from "../types/flightEntry";

const sampleEntry: FlightEntry = {
  date: "2026-08-20",
  departure: "OMDB",
  arrival: "EGLL",
  flightNumber: "EK0839",
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
  approaches: "",
  remarks: ""
};

describe("readAndParseBackupFile", () => {
  it("parses a valid backup CSV file", async () => {
    const csv = flightEntriesToCsv([sampleEntry]);
    const file = new File([csv], "logbook-backup.csv", { type: "text/csv" });

    const entries = await readAndParseBackupFile(file);

    expect(entries).toEqual([sampleEntry]);
  });

  it("rejects a file that isn't a logbook backup", async () => {
    const file = new File(["not,a,backup"], "random.csv", { type: "text/csv" });

    await expect(readAndParseBackupFile(file)).rejects.toThrow(CsvFormatError);
  });
});

describe("replaceAllFlightEntries", () => {
  it("clears existing entries and inserts the new ones with fresh ids", async () => {
    const db = new LogbookDatabase(`restore-test-db-${Math.random()}`);
    await db.open();
    await db.flightEntries.add({ ...sampleEntry, date: "2020-01-01" });

    await replaceAllFlightEntries(db, [sampleEntry, { ...sampleEntry, date: "2026-08-21" }]);

    const entries = await getAllFlightEntries(db);
    expect(entries.map((e) => e.date)).toEqual(["2026-08-20", "2026-08-21"]);
    expect(entries[0].id).not.toBe(entries[1].id);
  });
});
