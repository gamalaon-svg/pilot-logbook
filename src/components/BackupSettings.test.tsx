import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupSettings } from "./BackupSettings";

const noop = {
  onConnect: vi.fn(),
  onRestoreFile: vi.fn(),
  onExport: vi.fn(),
  onEmiratesImportFile: vi.fn()
};

describe("BackupSettings", () => {
  it("shows an unsupported message when backup isn't supported", () => {
    render(<BackupSettings status={{ supported: false, connected: false }} {...noop} />);
    expect(screen.getByText(/requires chrome or edge/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect backup folder/i })).not.toBeInTheDocument();
  });

  it("shows a connect button when supported but not connected", async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(<BackupSettings status={{ supported: true, connected: false }} {...noop} onConnect={onConnect} />);
    await user.click(screen.getByRole("button", { name: /connect backup folder/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it("shows the folder name and last backup time when connected", () => {
    render(
      <BackupSettings
        status={{
          supported: true,
          connected: true,
          folderName: "Logbook Backups",
          lastBackupAt: "2026-08-29T10:00:00.000Z"
        }}
        {...noop}
      />
    );
    expect(screen.getByText(/Logbook Backups/)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-29T10:00:00.000Z/)).toBeInTheDocument();
  });

  it("shows a reconnect button when there's a backup error", async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(
      <BackupSettings
        status={{ supported: true, connected: true, folderName: "Logbook Backups", lastBackupError: "Reconnect needed" }}
        {...noop}
        onConnect={onConnect}
      />
    );
    expect(screen.getByText("Reconnect needed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reconnect folder/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it("calls onExport when the Export button is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<BackupSettings status={{ supported: true, connected: false }} {...noop} onExport={onExport} />);
    await user.click(screen.getByRole("button", { name: /^export$/i }));
    expect(onExport).toHaveBeenCalled();
  });

  it("calls onRestoreFile with the selected file for Import", async () => {
    const user = userEvent.setup();
    const onRestoreFile = vi.fn();
    render(<BackupSettings status={{ supported: true, connected: false }} {...noop} onRestoreFile={onRestoreFile} />);
    const file = new File(["date,departure"], "backup.csv", { type: "text/csv" });
    const input = screen.getByLabelText(/^import$/i);
    await user.upload(input, file);
    expect(onRestoreFile).toHaveBeenCalledWith(file);
  });

  it("calls onEmiratesImportFile with the selected file", async () => {
    const user = userEvent.setup();
    const onEmiratesImportFile = vi.fn();
    render(
      <BackupSettings status={{ supported: true, connected: false }} {...noop} onEmiratesImportFile={onEmiratesImportFile} />
    );
    const file = new File(["dummy"], "CrewLogReports.xlsx");
    const input = screen.getByLabelText(/import emirates report/i);
    await user.upload(input, file);
    expect(onEmiratesImportFile).toHaveBeenCalledWith(file);
  });
});
