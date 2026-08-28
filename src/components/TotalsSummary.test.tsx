import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TotalsSummary } from "./TotalsSummary";
import type { FlightEntry } from "../types/flightEntry";

const entries: FlightEntry[] = [
  {
    id: 1,
    date: "2026-08-20",
    departure: "OMDB",
    arrival: "EGLL",
    aircraftType: "B777",
    aircraftRegistration: "A6-EXAMPLE",
    blockOffTime: "08:00",
    blockOnTime: "10:30",
    totalTimeMinutes: 150,
    role: "PIC",
    dayTimeMinutes: 150,
    nightTimeMinutes: 0,
    ifrTimeMinutes: 150,
    vfrTimeMinutes: 0,
    crossCountryTimeMinutes: 150,
    landingsDay: 1,
    landingsNight: 0,
    approaches: "",
    remarks: ""
  }
];

describe("TotalsSummary", () => {
  it("shows totals by aircraft type, role, and year", () => {
    render(<TotalsSummary entries={entries} />);
    expect(screen.getByText(/B777/)).toBeInTheDocument();
    expect(screen.getByText(/PIC/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getAllByText(/2:30/).length).toBeGreaterThan(0);
  });
});
