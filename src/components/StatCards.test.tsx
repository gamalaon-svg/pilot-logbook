import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCards } from "./StatCards";
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

describe("StatCards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows total time, PIC time, this year's time, and landings", () => {
    const entries: FlightEntry[] = [
      makeEntry({ date: "2025-01-01", role: "PIC", totalTimeMinutes: 60, landingsDay: 1, landingsNight: 0 }),
      makeEntry({ date: "2026-02-01", role: "SIC", totalTimeMinutes: 90, landingsDay: 0, landingsNight: 1 }),
      makeEntry({ date: "2026-03-01", role: "PIC", totalTimeMinutes: 120, landingsDay: 1, landingsNight: 1 })
    ];

    render(<StatCards entries={entries} />);

    expect(screen.getByText("4:30")).toBeInTheDocument();
    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(screen.getByText("3:30")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
