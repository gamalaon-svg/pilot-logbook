import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectBackupFolder, getBackupStatus, isBackupSupported, writeBackup } from "./backupWriter";
import { deleteSetting, getSetting, setSetting } from "../db/settings";
import { getAllFlightEntries } from "../db/flightEntries";
import type { LogbookDatabase } from "../db/db";
import type { FlightEntry } from "../types/flightEntry";

vi.mock("../db/settings");
vi.mock("../db/flightEntries");

const db = {} as LogbookDatabase;

const sampleEntry: FlightEntry = {
  date: "2026-08-20",
  departure: "OMDB",
  arrival: "EGLL",
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

function makeMockHandle(permission: PermissionState = "granted") {
  const written: string[] = [];
  const writable = {
    write: vi.fn(async (data: string) => {
      written.push(data);
    }),
    close: vi.fn(async () => {})
  };
  const fileHandle = {
    createWritable: vi.fn(async () => writable)
  };
  const directoryHandle = {
    name: "Logbook Backups",
    queryPermission: vi.fn(async () => permission),
    getFileHandle: vi.fn(async () => fileHandle)
  };
  return { directoryHandle, fileHandle, writable, written };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isBackupSupported", () => {
  it("returns true when showDirectoryPicker exists on window", () => {
    (window as any).showDirectoryPicker = vi.fn();
    expect(isBackupSupported()).toBe(true);
    delete (window as any).showDirectoryPicker;
  });

  it("returns false when showDirectoryPicker is absent", () => {
    delete (window as any).showDirectoryPicker;
    expect(isBackupSupported()).toBe(false);
  });
});

describe("connectBackupFolder", () => {
  it("stores the picked directory handle and clears any prior error", async () => {
    const { directoryHandle } = makeMockHandle();
    (window as any).showDirectoryPicker = vi.fn(async () => directoryHandle);

    await connectBackupFolder(db);

    expect(setSetting).toHaveBeenCalledWith(db, "backupDirectoryHandle", directoryHandle);
    expect(deleteSetting).toHaveBeenCalledWith(db, "lastBackupError");
  });

  it("does nothing when the user cancels the folder picker", async () => {
    const abortError = new Error("The user aborted a request.");
    abortError.name = "AbortError";
    (window as any).showDirectoryPicker = vi.fn(async () => {
      throw abortError;
    });

    await expect(connectBackupFolder(db)).resolves.toBeUndefined();

    expect(setSetting).not.toHaveBeenCalled();
    expect(deleteSetting).not.toHaveBeenCalled();
  });
});

describe("writeBackup", () => {
  beforeEach(() => {
    vi.mocked(getAllFlightEntries).mockResolvedValue([sampleEntry]);
  });

  it("does nothing when no folder is connected", async () => {
    vi.mocked(getSetting).mockResolvedValue(undefined);

    await writeBackup(db);

    expect(setSetting).not.toHaveBeenCalled();
  });

  it("writes the CSV and records the backup time when permission is granted", async () => {
    const { directoryHandle, fileHandle, writable } = makeMockHandle("granted");
    vi.mocked(getSetting).mockImplementation(async (_db, key) =>
      key === "backupDirectoryHandle" ? (directoryHandle as any) : undefined
    );

    await writeBackup(db);

    expect(directoryHandle.getFileHandle).toHaveBeenCalledWith("logbook-backup.csv", { create: true });
    expect(fileHandle.createWritable).toHaveBeenCalled();
    expect(writable.write).toHaveBeenCalledWith(expect.stringContaining("OMDB"));
    expect(writable.close).toHaveBeenCalled();
    expect(setSetting).toHaveBeenCalledWith(db, "lastBackupAt", expect.any(String));
    expect(deleteSetting).toHaveBeenCalledWith(db, "lastBackupError");
  });

  it("records a reconnect error and does not write when permission is not granted", async () => {
    const { directoryHandle } = makeMockHandle("denied");
    vi.mocked(getSetting).mockImplementation(async (_db, key) =>
      key === "backupDirectoryHandle" ? (directoryHandle as any) : undefined
    );

    await writeBackup(db);

    expect(directoryHandle.getFileHandle).not.toHaveBeenCalled();
    expect(setSetting).toHaveBeenCalledWith(db, "lastBackupError", "Reconnect needed");
  });

  it("records the error message when writing throws", async () => {
    const { directoryHandle, fileHandle } = makeMockHandle("granted");
    fileHandle.createWritable = vi.fn(async () => {
      throw new Error("disk full");
    });
    vi.mocked(getSetting).mockImplementation(async (_db, key) =>
      key === "backupDirectoryHandle" ? (directoryHandle as any) : undefined
    );

    await writeBackup(db);

    expect(setSetting).toHaveBeenCalledWith(db, "lastBackupError", "disk full");
  });
});

describe("getBackupStatus", () => {
  it("reports not connected and not supported when nothing is set up", async () => {
    delete (window as any).showDirectoryPicker;
    vi.mocked(getSetting).mockResolvedValue(undefined);

    const status = await getBackupStatus(db);

    expect(status).toEqual({
      supported: false,
      connected: false,
      folderName: undefined,
      lastBackupAt: undefined,
      lastBackupError: undefined
    });
  });

  it("reports connected status with folder name and last backup time", async () => {
    const { directoryHandle } = makeMockHandle();
    (window as any).showDirectoryPicker = vi.fn();
    vi.mocked(getSetting).mockImplementation(async (_db, key) => {
      if (key === "backupDirectoryHandle") return directoryHandle as any;
      if (key === "lastBackupAt") return "2026-08-29T10:00:00.000Z" as any;
      return undefined;
    });

    const status = await getBackupStatus(db);

    expect(status).toEqual({
      supported: true,
      connected: true,
      folderName: "Logbook Backups",
      lastBackupAt: "2026-08-29T10:00:00.000Z",
      lastBackupError: undefined
    });

    delete (window as any).showDirectoryPicker;
  });
});
