import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { commitEmiratesImport, prepareEmiratesImport } from "./import/emiratesImport";

vi.mock("./import/emiratesImport");

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
    expect(await screen.findByLabelText(/^import$/i)).toBeInTheDocument();
  });

  it("imports new flights from an Emirates report after confirmation", async () => {
    const user = userEvent.setup();
    const newEntry = {
      date: "2011-05-26",
      departure: "DXB",
      arrival: "BAH",
      aircraftType: "A330",
      aircraftRegistration: "A6EAR",
      blockOffTime: "12:28",
      blockOnTime: "13:39",
      totalTimeMinutes: 71,
      role: "SIC" as const,
      dayTimeMinutes: 71,
      nightTimeMinutes: 0,
      ifrTimeMinutes: 71,
      vfrTimeMinutes: 0,
      crossCountryTimeMinutes: 71,
      landingsDay: 0,
      landingsNight: 0,
      approaches: "",
      remarks: ""
    };
    vi.mocked(prepareEmiratesImport).mockResolvedValue({
      newEntries: [newEntry],
      entriesToUpdate: [],
      duplicateCount: 0,
      totalInFile: 1
    });
    vi.mocked(commitEmiratesImport).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Backup" }));

    const file = new File(["dummy"], "CrewLogReports.xlsx");
    const input = screen.getByLabelText(/import emirates report/i);
    await user.upload(input, file);

    expect(prepareEmiratesImport).toHaveBeenCalled();
    expect(commitEmiratesImport).toHaveBeenCalledWith(expect.anything(), [newEntry], []);

    vi.restoreAllMocks();
  });
});
