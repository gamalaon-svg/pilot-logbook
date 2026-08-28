import { describe, expect, it } from "vitest";
import {
  totalMinutesByAircraftType,
  totalMinutesByRole,
  totalMinutesByYear,
  sumTotalMinutes,
  sumTotalLandings,
  sumMinutesForYear
} from "./totals";
import type { FlightEntry } from "../types/flightEntry";

function makeEntry(overrides: Partial<FlightEntry>): FlightEntry {
  return {
    date: "2026-01-01",
    departure: "OMDB",
    arrival: "EGLL",
    aircraftType: "B777",
    aircraftRegistration: "A6-EXAMPLE",
    blockOffTime: "08:00",
    blockOnTime: "09:00",
    totalTimeMinutes: 60,
    role: "PIC",
    dayTimeMinutes: 60,
    nightTimeMinutes: 0,
    ifrTimeMinutes: 60,
    vfrTimeMinutes: 0,
    crossCountryTimeMinutes: 60,
    landingsDay: 1,
    landingsNight: 0,
    approaches: "",
    remarks: "",
    ...overrides
  };
}

describe("totals", () => {
  const entries = [
    makeEntry({ aircraftType: "B777", role: "PIC", date: "2025-06-01", totalTimeMinutes: 60 }),
    makeEntry({ aircraftType: "B777", role: "SIC", date: "2026-01-01", totalTimeMinutes: 90 }),
    makeEntry({ aircraftType: "A380", role: "PIC", date: "2026-02-01", totalTimeMinutes: 120 })
  ];

  it("totals minutes by aircraft type", () => {
    expect(totalMinutesByAircraftType(entries)).toEqual({ B777: 150, A380: 120 });
  });

  it("totals minutes by role", () => {
    expect(totalMinutesByRole(entries)).toEqual({ PIC: 180, SIC: 90 });
  });

  it("totals minutes by year", () => {
    expect(totalMinutesByYear(entries)).toEqual({ "2025": 60, "2026": 210 });
  });

  it("returns an empty object for no entries", () => {
    expect(totalMinutesByAircraftType([])).toEqual({});
  });

  it("sums total minutes across all entries", () => {
    expect(sumTotalMinutes(entries)).toBe(270);
  });

  it("sums total landings across all entries", () => {
    expect(sumTotalLandings(entries)).toBe(3);
  });

  it("sums minutes for a specific year", () => {
    expect(sumMinutesForYear(entries, 2026)).toBe(210);
    expect(sumMinutesForYear(entries, 2025)).toBe(60);
  });
});
