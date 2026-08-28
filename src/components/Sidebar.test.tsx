import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders all three nav items", () => {
    render(<Sidebar activeView="logbook" onSelectView={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Logbook" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Totals" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Backup" })).toBeInTheDocument();
  });

  it("marks the active view", () => {
    render(<Sidebar activeView="totals" onSelectView={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Totals" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Logbook" })).not.toHaveClass("active");
  });

  it("calls onSelectView when a nav item is clicked", async () => {
    const user = userEvent.setup();
    const onSelectView = vi.fn();
    render(<Sidebar activeView="logbook" onSelectView={onSelectView} />);
    await user.click(screen.getByRole("button", { name: "Backup" }));
    expect(onSelectView).toHaveBeenCalledWith("backup");
  });
});
