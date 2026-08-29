import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlightEntryForm } from "./FlightEntryForm";

describe("FlightEntryForm", () => {
  it("submits a completed entry with computed total time", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FlightEntryForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/date/i), "2026-08-20");
    await user.type(screen.getByLabelText(/departure/i), "OMDB");
    await user.type(screen.getByLabelText(/arrival/i), "EGLL");
    await user.type(screen.getByLabelText(/flight number/i), "EK0839");
    await user.type(screen.getByLabelText(/aircraft type/i), "B777");
    await user.type(screen.getByLabelText(/registration/i), "A6-EXAMPLE");
    await user.type(screen.getByLabelText(/block off/i), "08:00");
    await user.type(screen.getByLabelText(/block on/i), "10:30");
    await user.selectOptions(screen.getByLabelText(/role/i), "PIC");
    await user.type(screen.getByLabelText(/day time/i), "150");
    await user.type(screen.getByLabelText(/night time/i), "0");
    await user.type(screen.getByLabelText(/ifr time/i), "150");
    await user.type(screen.getByLabelText(/vfr time/i), "0");
    await user.type(screen.getByLabelText(/cross-country/i), "150");
    await user.type(screen.getByLabelText(/day landings/i), "1");
    await user.type(screen.getByLabelText(/night landings/i), "0");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-08-20",
        departure: "OMDB",
        arrival: "EGLL",
        flightNumber: "EK0839",
        blockOffTime: "08:00",
        blockOnTime: "10:30",
        totalTimeMinutes: 150,
        role: "PIC"
      })
    );
  });

  it("shows an error and does not submit on an invalid block time", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FlightEntryForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/block off/i), "99:99");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/invalid time/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
