import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlightEntryList } from "./FlightEntryList";
import type { FlightEntry } from "../types/flightEntry";

const entries: FlightEntry[] = [
  {
    id: 1,
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
    approaches: "ILS x1",
    remarks: ""
  }
];

describe("FlightEntryList", () => {
  it("renders a row per entry", () => {
    render(<FlightEntryList entries={entries} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("OMDB")).toBeInTheDocument();
    expect(screen.getByText("EGLL")).toBeInTheDocument();
    expect(screen.getByText("EK0839")).toBeInTheDocument();
    expect(screen.getByText("7:30")).toBeInTheDocument();
  });

  it("calls onEdit when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<FlightEntryList entries={entries} onEdit={onEdit} onDelete={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(entries[0]);
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<FlightEntryList entries={entries} onEdit={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
