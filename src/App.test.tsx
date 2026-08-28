import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  it("adds a flight entry via the Add Flight panel and shows it in the list", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /add flight/i }));

    await user.type(screen.getByLabelText(/date/i), "2026-08-20");
    await user.type(screen.getByLabelText(/departure/i), "OMDB");
    await user.type(screen.getByLabelText(/arrival/i), "EGLL");
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

    expect(await screen.findByText("OMDB")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^date$/i)).not.toBeInTheDocument();
  });

  it("switches to the Totals view", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Totals" }));
    expect(await screen.findByText("By aircraft type")).toBeInTheDocument();
  });

  it("switches to the Backup view", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Backup" }));
    expect(await screen.findByLabelText(/restore from backup/i)).toBeInTheDocument();
  });
});
