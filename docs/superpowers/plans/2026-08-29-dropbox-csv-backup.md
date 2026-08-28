# Dropbox CSV Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Gamal connect a local folder inside his Dropbox, after which every add/edit/delete silently (re)writes a `logbook-backup.csv` file there for Dropbox's own client to sync to the cloud, and let him restore his logbook from that CSV on any device.

**Architecture:** Backup-writing uses the File System Access API (Chrome/Edge on Windows only) to get persistent write access to a folder and overwrite one CSV file after every mutation. Restore uses a plain file input (works everywhere) to read a CSV back in and replace all flight entries. A new `settings` key/value table in the existing Dexie database tracks the connected folder handle and backup status. No Dropbox API, no OAuth, no backend.

**Tech Stack:** Same as Phase 1 (React, TypeScript, Vite, Dexie/IndexedDB, Vitest + React Testing Library) plus the browser-native File System Access API.

---

## File Structure

```
src/
  types/
    settings.ts                 (new: SettingKey, SettingRecord)
    fileSystemAccess.d.ts       (new: ambient types for File System Access API)
  db/
    db.ts                       (modified: version 2, settings table)
    settings.ts                 (new: getSetting/setSetting/deleteSetting)
    settings.test.ts            (new)
  backup/
    csv.ts                      (new: flightEntriesToCsv / parseFlightEntriesCsv)
    csv.test.ts                 (new)
    backupWriter.ts             (new: connect/write/status)
    backupWriter.test.ts        (new)
    restore.ts                  (new: read+parse file, replace all entries)
    restore.test.ts             (new)
  components/
    BackupSettings.tsx          (new)
    BackupSettings.test.tsx     (new)
  App.tsx                       (modified: wire backup trigger + restore + render BackupSettings)
  App.test.tsx                  (modified: add a test for the backup section)
```

---

### Task 1: Settings data layer

**Files:**
- Create: `src/types/settings.ts`
- Create: `src/db/settings.ts`
- Modify: `src/db/db.ts`
- Test: `src/db/settings.test.ts`

- [ ] **Step 1: Create the settings type**

```ts
// src/types/settings.ts
export type SettingKey = "backupDirectoryHandle" | "lastBackupAt" | "lastBackupError";

export interface SettingRecord {
  key: SettingKey;
  value: unknown;
}
```

- [ ] **Step 2: Write the failing test for settings CRUD**

```ts
// src/db/settings.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { LogbookDatabase } from "./db";
import { deleteSetting, getSetting, setSetting } from "./settings";

describe("settings", () => {
  let db: LogbookDatabase;

  beforeEach(async () => {
    db = new LogbookDatabase(`settings-test-db-${Math.random()}`);
    await db.open();
  });

  it("returns undefined for a key that has never been set", async () => {
    const value = await getSetting(db, "lastBackupAt");
    expect(value).toBeUndefined();
  });

  it("stores and retrieves a string value", async () => {
    await setSetting(db, "lastBackupAt", "2026-08-29T10:00:00.000Z");
    const value = await getSetting<string>(db, "lastBackupAt");
    expect(value).toBe("2026-08-29T10:00:00.000Z");
  });

  it("overwrites an existing value", async () => {
    await setSetting(db, "lastBackupError", "first error");
    await setSetting(db, "lastBackupError", "second error");
    const value = await getSetting<string>(db, "lastBackupError");
    expect(value).toBe("second error");
  });

  it("deletes a value", async () => {
    await setSetting(db, "lastBackupError", "some error");
    await deleteSetting(db, "lastBackupError");
    const value = await getSetting(db, "lastBackupError");
    expect(value).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/db/settings.test.ts`
Expected: FAIL — `Cannot find module './settings'` (and `db.settings` doesn't exist yet).

- [ ] **Step 4: Add the settings table to the database schema**

Replace the full contents of `src/db/db.ts`:

```ts
import Dexie, { Table } from "dexie";
import type { FlightEntry } from "../types/flightEntry";
import type { SettingRecord } from "../types/settings";

export class LogbookDatabase extends Dexie {
  declare flightEntries: Table<FlightEntry, number>;
  declare settings: Table<SettingRecord, string>;

  constructor(name = "LogbookDatabase") {
    super(name);
    this.version(1).stores({
      flightEntries: "++id, date, aircraftType, role"
    });
    this.version(2).stores({
      flightEntries: "++id, date, aircraftType, role",
      settings: "key"
    });
  }
}

export const db = new LogbookDatabase();
```

- [ ] **Step 5: Implement the settings CRUD functions**

```ts
// src/db/settings.ts
import type { LogbookDatabase } from "./db";
import type { SettingKey } from "../types/settings";

export async function getSetting<T = unknown>(db: LogbookDatabase, key: SettingKey): Promise<T | undefined> {
  const record = await db.settings.get(key);
  return record?.value as T | undefined;
}

export async function setSetting(db: LogbookDatabase, key: SettingKey, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function deleteSetting(db: LogbookDatabase, key: SettingKey): Promise<void> {
  await db.settings.delete(key);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/db/settings.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/types/settings.ts src/db/settings.ts src/db/settings.test.ts src/db/db.ts
git commit -m "feat: add settings key/value table"
```

---

### Task 2: CSV encoding and parsing

**Files:**
- Create: `src/backup/csv.ts`
- Test: `src/backup/csv.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/backup/csv.test.ts
import { describe, expect, it } from "vitest";
import { CsvFormatError, flightEntriesToCsv, parseFlightEntriesCsv } from "./csv";
import type { FlightEntry } from "../types/flightEntry";

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
  approaches: "ILS x1",
  remarks: "Great flight"
};

describe("flightEntriesToCsv", () => {
  it("writes a header row and one data row", () => {
    const csv = flightEntriesToCsv([sampleEntry]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "date,departure,arrival,aircraftType,aircraftRegistration,blockOffTime,blockOnTime,totalTimeMinutes,role,dayTimeMinutes,nightTimeMinutes,ifrTimeMinutes,vfrTimeMinutes,crossCountryTimeMinutes,landingsDay,landingsNight,approaches,remarks"
    );
    expect(lines[1]).toBe(
      "2026-08-20,OMDB,EGLL,B777,A6-EXAMPLE,08:00,15:30,450,PIC,450,0,450,0,450,1,0,ILS x1,Great flight"
    );
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const entry: FlightEntry = { ...sampleEntry, remarks: 'Diverted, landed "long", then\ntaxied in' };
    const csv = flightEntriesToCsv([entry]);
    expect(csv).toContain('"Diverted, landed ""long"", then\ntaxied in"');
  });

  it("returns just the header for an empty list", () => {
    const csv = flightEntriesToCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

describe("parseFlightEntriesCsv", () => {
  it("round-trips a simple entry", () => {
    const csv = flightEntriesToCsv([sampleEntry]);
    const [parsed] = parseFlightEntriesCsv(csv);
    expect(parsed).toEqual(sampleEntry);
  });

  it("round-trips an entry with quoted commas, quotes, and newlines", () => {
    const entry: FlightEntry = { ...sampleEntry, remarks: 'Diverted, landed "long", then\ntaxied in' };
    const csv = flightEntriesToCsv([entry]);
    const [parsed] = parseFlightEntriesCsv(csv);
    expect(parsed).toEqual(entry);
  });

  it("parses numeric fields as numbers", () => {
    const csv = flightEntriesToCsv([sampleEntry]);
    const [parsed] = parseFlightEntriesCsv(csv);
    expect(parsed.totalTimeMinutes).toBe(450);
    expect(typeof parsed.totalTimeMinutes).toBe("number");
  });

  it("throws CsvFormatError when the header doesn't match", () => {
    expect(() => parseFlightEntriesCsv("wrong,header\n1,2")).toThrow(CsvFormatError);
  });

  it("returns an empty array for a header-only CSV", () => {
    const csv = flightEntriesToCsv([]);
    expect(parseFlightEntriesCsv(csv)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/backup/csv.test.ts`
Expected: FAIL — `Cannot find module './csv'`.

- [ ] **Step 3: Implement the CSV module**

```ts
// src/backup/csv.ts
import type { FlightEntry } from "../types/flightEntry";

const HEADER = [
  "date",
  "departure",
  "arrival",
  "aircraftType",
  "aircraftRegistration",
  "blockOffTime",
  "blockOnTime",
  "totalTimeMinutes",
  "role",
  "dayTimeMinutes",
  "nightTimeMinutes",
  "ifrTimeMinutes",
  "vfrTimeMinutes",
  "crossCountryTimeMinutes",
  "landingsDay",
  "landingsNight",
  "approaches",
  "remarks"
] as const satisfies readonly (keyof FlightEntry)[];

const NUMERIC_FIELDS = new Set<string>([
  "totalTimeMinutes",
  "dayTimeMinutes",
  "nightTimeMinutes",
  "ifrTimeMinutes",
  "vfrTimeMinutes",
  "crossCountryTimeMinutes",
  "landingsDay",
  "landingsNight"
]);

export class CsvFormatError extends Error {}

function csvField(value: string | number): string {
  const str = String(value);
  if (/["\n,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function flightEntriesToCsv(entries: FlightEntry[]): string {
  const lines = [HEADER.join(",")];
  for (const entry of entries) {
    lines.push(HEADER.map((key) => csvField(entry[key])).join(","));
  }
  return lines.join("\n");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseFlightEntriesCsv(text: string): FlightEntry[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    throw new CsvFormatError("CSV file is empty");
  }
  const header = rows[0];
  const headerMatches = header.length === HEADER.length && header.every((value, i) => value === HEADER[i]);
  if (!headerMatches) {
    throw new CsvFormatError("CSV header does not match the expected logbook backup format");
  }
  return rows.slice(1).map((row, rowIndex) => {
    if (row.length !== HEADER.length) {
      throw new CsvFormatError(`Row ${rowIndex + 1} has ${row.length} fields, expected ${HEADER.length}`);
    }
    const entry = {} as Record<string, string | number>;
    HEADER.forEach((key, i) => {
      const raw = row[i];
      entry[key] = NUMERIC_FIELDS.has(key) ? Number(raw) : raw;
    });
    return entry as unknown as FlightEntry;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/backup/csv.test.ts`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/backup/csv.ts src/backup/csv.test.ts
git commit -m "feat: add CSV encoding/parsing for logbook backups"
```

---

### Task 3: File System Access API type declarations

**Files:**
- Create: `src/types/fileSystemAccess.d.ts`

TypeScript's bundled DOM types don't include the File System Access API
(`showDirectoryPicker`, `FileSystemDirectoryHandle`, etc. — it's a
Chromium-only API not yet in the standard TS DOM lib). This adds just the
pieces this app uses.

- [ ] **Step 1: Add the ambient type declarations**

```ts
// src/types/fileSystemAccess.d.ts
export {};

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: "read" | "readwrite";
  }

  interface FileSystemHandle {
    readonly kind: "file" | "directory";
    readonly name: string;
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: "file";
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: "directory";
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  }

  interface Window {
    showDirectoryPicker(options?: { mode?: "read" | "readwrite" }): Promise<FileSystemDirectoryHandle>;
  }
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/fileSystemAccess.d.ts
git commit -m "chore: add File System Access API type declarations"
```

---

### Task 4: Backup writer

**Files:**
- Create: `src/backup/backupWriter.ts`
- Test: `src/backup/backupWriter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/backup/backupWriter.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/backup/backupWriter.test.ts`
Expected: FAIL — `Cannot find module './backupWriter'`.

- [ ] **Step 3: Implement the backup writer**

```ts
// src/backup/backupWriter.ts
import type { LogbookDatabase } from "../db/db";
import { deleteSetting, getSetting, setSetting } from "../db/settings";
import { getAllFlightEntries } from "../db/flightEntries";
import { flightEntriesToCsv } from "./csv";

const BACKUP_FILE_NAME = "logbook-backup.csv";

export function isBackupSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function connectBackupFolder(db: LogbookDatabase): Promise<void> {
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await setSetting(db, "backupDirectoryHandle", handle);
  await deleteSetting(db, "lastBackupError");
}

export async function writeBackup(db: LogbookDatabase): Promise<void> {
  const handle = await getSetting<FileSystemDirectoryHandle>(db, "backupDirectoryHandle");
  if (!handle) {
    return;
  }
  try {
    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      await setSetting(db, "lastBackupError", "Reconnect needed");
      return;
    }
    const entries = await getAllFlightEntries(db);
    const csv = flightEntriesToCsv(entries);
    const fileHandle = await handle.getFileHandle(BACKUP_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(csv);
    await writable.close();
    await setSetting(db, "lastBackupAt", new Date().toISOString());
    await deleteSetting(db, "lastBackupError");
  } catch (err) {
    await setSetting(db, "lastBackupError", (err as Error).message);
  }
}

export interface BackupStatus {
  supported: boolean;
  connected: boolean;
  folderName?: string;
  lastBackupAt?: string;
  lastBackupError?: string;
}

export async function getBackupStatus(db: LogbookDatabase): Promise<BackupStatus> {
  const handle = await getSetting<FileSystemDirectoryHandle>(db, "backupDirectoryHandle");
  const lastBackupAt = await getSetting<string>(db, "lastBackupAt");
  const lastBackupError = await getSetting<string>(db, "lastBackupError");
  return {
    supported: isBackupSupported(),
    connected: handle !== undefined,
    folderName: handle?.name,
    lastBackupAt,
    lastBackupError
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/backup/backupWriter.test.ts`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/backup/backupWriter.ts src/backup/backupWriter.test.ts
git commit -m "feat: add backup folder connect/write/status logic"
```

---

### Task 5: Restore logic

**Files:**
- Create: `src/backup/restore.ts`
- Test: `src/backup/restore.test.ts`

**Note:** keep this file's only IndexedDB-touching test as the sole one in
the file. A prior investigation (see [[project-pilot-logbook-app]] memory)
found that Vitest + fake-indexeddb throws a spurious `ConstraintError` when a
test file has an earlier IndexedDB-touching test followed by one that bulk-inserts
multiple full-shape `FlightEntry` records — even though the same code works
fine in a real browser and in plain Node. Splitting the risky test into its
own file (or, as done here, keeping it as the only DB test in the file)
avoids it.

- [ ] **Step 1: Write the failing tests**

```ts
// src/backup/restore.test.ts
import { describe, expect, it } from "vitest";
import { LogbookDatabase } from "../db/db";
import { getAllFlightEntries } from "../db/flightEntries";
import { CsvFormatError, flightEntriesToCsv } from "./csv";
import { readAndParseBackupFile, replaceAllFlightEntries } from "./restore";
import type { FlightEntry } from "../types/flightEntry";

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

describe("readAndParseBackupFile", () => {
  it("parses a valid backup CSV file", async () => {
    const csv = flightEntriesToCsv([sampleEntry]);
    const file = new File([csv], "logbook-backup.csv", { type: "text/csv" });

    const entries = await readAndParseBackupFile(file);

    expect(entries).toEqual([sampleEntry]);
  });

  it("rejects a file that isn't a logbook backup", async () => {
    const file = new File(["not,a,backup"], "random.csv", { type: "text/csv" });

    await expect(readAndParseBackupFile(file)).rejects.toThrow(CsvFormatError);
  });
});

describe("replaceAllFlightEntries", () => {
  it("clears existing entries and inserts the new ones with fresh ids", async () => {
    const db = new LogbookDatabase(`restore-test-db-${Math.random()}`);
    await db.open();
    await db.flightEntries.add({ ...sampleEntry, date: "2020-01-01" });

    await replaceAllFlightEntries(db, [sampleEntry, { ...sampleEntry, date: "2026-08-21" }]);

    const entries = await getAllFlightEntries(db);
    expect(entries.map((e) => e.date)).toEqual(["2026-08-20", "2026-08-21"]);
    expect(entries[0].id).not.toBe(entries[1].id);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/backup/restore.test.ts`
Expected: FAIL — `Cannot find module './restore'`.

- [ ] **Step 3: Implement the restore module**

```ts
// src/backup/restore.ts
import type { LogbookDatabase } from "../db/db";
import type { FlightEntry } from "../types/flightEntry";
import { parseFlightEntriesCsv } from "./csv";

export async function readAndParseBackupFile(file: File): Promise<FlightEntry[]> {
  const text = await file.text();
  return parseFlightEntriesCsv(text);
}

export async function replaceAllFlightEntries(db: LogbookDatabase, entries: FlightEntry[]): Promise<void> {
  await db.transaction("rw", db.flightEntries, async () => {
    await db.flightEntries.clear();
    await db.flightEntries.bulkAdd(entries);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/backup/restore.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/backup/restore.ts src/backup/restore.test.ts
git commit -m "feat: add restore-from-backup logic"
```

---

### Task 6: BackupSettings component

**Files:**
- Create: `src/components/BackupSettings.tsx`
- Test: `src/components/BackupSettings.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/BackupSettings.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupSettings } from "./BackupSettings";

describe("BackupSettings", () => {
  it("shows an unsupported message when backup isn't supported", () => {
    render(
      <BackupSettings status={{ supported: false, connected: false }} onConnect={vi.fn()} onRestoreFile={vi.fn()} />
    );
    expect(screen.getByText(/requires chrome or edge/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect backup folder/i })).not.toBeInTheDocument();
  });

  it("shows a connect button when supported but not connected", async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(
      <BackupSettings status={{ supported: true, connected: false }} onConnect={onConnect} onRestoreFile={vi.fn()} />
    );
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
        onConnect={vi.fn()}
        onRestoreFile={vi.fn()}
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
        onConnect={onConnect}
        onRestoreFile={vi.fn()}
      />
    );
    expect(screen.getByText("Reconnect needed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reconnect folder/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it("calls onRestoreFile with the selected file", async () => {
    const user = userEvent.setup();
    const onRestoreFile = vi.fn();
    render(
      <BackupSettings status={{ supported: true, connected: false }} onConnect={vi.fn()} onRestoreFile={onRestoreFile} />
    );
    const file = new File(["date,departure"], "backup.csv", { type: "text/csv" });
    const input = screen.getByLabelText(/restore from backup/i);
    await user.upload(input, file);
    expect(onRestoreFile).toHaveBeenCalledWith(file);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/BackupSettings.test.tsx`
Expected: FAIL — `Cannot find module './BackupSettings'`.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/BackupSettings.tsx
import { ChangeEvent } from "react";
import type { BackupStatus } from "../backup/backupWriter";

interface BackupSettingsProps {
  status: BackupStatus;
  onConnect: () => void;
  onRestoreFile: (file: File) => void;
}

export function BackupSettings({ status, onConnect, onRestoreFile }: BackupSettingsProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onRestoreFile(file);
    }
    event.target.value = "";
  }

  return (
    <section>
      <h2>Backup</h2>
      {!status.supported && <p>Backup requires Chrome or Edge on Windows.</p>}
      {status.supported && !status.connected && (
        <button type="button" onClick={onConnect}>
          Connect backup folder
        </button>
      )}
      {status.supported && status.connected && (
        <div>
          <p>Backing up to: {status.folderName}</p>
          {status.lastBackupError ? (
            <div>
              <p role="alert">{status.lastBackupError}</p>
              <button type="button" onClick={onConnect}>
                Reconnect folder
              </button>
            </div>
          ) : (
            status.lastBackupAt && <p>Last backup: {status.lastBackupAt}</p>
          )}
        </div>
      )}
      <label htmlFor="restoreFile">Restore from backup</label>
      <input id="restoreFile" type="file" accept=".csv" onChange={handleFileChange} />
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/BackupSettings.test.tsx`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/BackupSettings.tsx src/components/BackupSettings.test.tsx
git commit -m "feat: add BackupSettings component"
```

---

### Task 7: Wire backup into App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe("App", ...)` block in `src/App.test.tsx`
(keep the existing "adds a flight entry..." test as-is):

```tsx
it("shows the backup section with a restore control", async () => {
  render(<App />);
  expect(await screen.findByText("Backup")).toBeInTheDocument();
  expect(screen.getByLabelText(/restore from backup/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — no "Backup" section rendered yet.

- [ ] **Step 3: Wire backup and restore into App**

Replace the full contents of `src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { db } from "./db/db";
import { addFlightEntry, deleteFlightEntry, getAllFlightEntries, updateFlightEntry } from "./db/flightEntries";
import { FlightEntryForm } from "./components/FlightEntryForm";
import { FlightEntryList } from "./components/FlightEntryList";
import { TotalsSummary } from "./components/TotalsSummary";
import { BackupSettings } from "./components/BackupSettings";
import { connectBackupFolder, getBackupStatus, writeBackup, type BackupStatus } from "./backup/backupWriter";
import { readAndParseBackupFile, replaceAllFlightEntries } from "./backup/restore";
import type { FlightEntry } from "./types/flightEntry";

const INITIAL_BACKUP_STATUS: BackupStatus = { supported: false, connected: false };

export default function App() {
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FlightEntry | undefined>(undefined);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>(INITIAL_BACKUP_STATUS);

  async function reload() {
    setEntries(await getAllFlightEntries(db));
  }

  async function refreshBackupStatus() {
    setBackupStatus(await getBackupStatus(db));
  }

  useEffect(() => {
    reload();
    refreshBackupStatus();
  }, []);

  async function triggerBackup() {
    await writeBackup(db);
    await refreshBackupStatus();
  }

  async function handleSubmit(entry: FlightEntry) {
    if (editingEntry?.id !== undefined) {
      await updateFlightEntry(db, editingEntry.id, entry);
      setEditingEntry(undefined);
    } else {
      await addFlightEntry(db, entry);
    }
    await reload();
    await triggerBackup();
  }

  async function handleDelete(id: number) {
    await deleteFlightEntry(db, id);
    await reload();
    await triggerBackup();
  }

  async function handleConnect() {
    await connectBackupFolder(db);
    await triggerBackup();
  }

  async function handleRestoreFile(file: File) {
    let parsedEntries: FlightEntry[];
    try {
      parsedEntries = await readAndParseBackupFile(file);
    } catch (err) {
      window.alert(`Could not read backup file: ${(err as Error).message}`);
      return;
    }
    const confirmed = window.confirm(
      `This will replace your current ${entries.length} flight entries with ${parsedEntries.length} entries from this backup. This can't be undone. Continue?`
    );
    if (!confirmed) {
      return;
    }
    await replaceAllFlightEntries(db, parsedEntries);
    await reload();
  }

  return (
    <main>
      <h1>Pilot Logbook</h1>
      <FlightEntryForm key={editingEntry?.id ?? "new"} initialValue={editingEntry} onSubmit={handleSubmit} />
      <FlightEntryList entries={entries} onEdit={setEditingEntry} onDelete={handleDelete} />
      <TotalsSummary entries={entries} />
      <BackupSettings status={backupStatus} onConnect={handleConnect} onRestoreFile={handleRestoreFile} />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS, both tests green.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire backup and restore into App"
```

---

### Task 8: Manual smoke test in a real browser

This exercises the File System Access API, which jsdom cannot simulate, so
it must be checked by hand in an actual Chromium browser (Chrome or Edge).

- [ ] **Step 1: Build and preview**

Run: `npm run build && npm run preview`

Open the printed local URL (e.g. `http://localhost:4173`) in Chrome or Edge.

- [ ] **Step 2: Connect a backup folder and verify the file is written**

1. Scroll to the "Backup" section — it should show a **Connect backup
   folder** button.
2. Click it and pick (or create) a folder inside your local Dropbox folder
   (e.g. a new `Logbook Backups` folder under your Dropbox).
3. The section should now show "Backing up to: `<folder name>`" and a
   "Last backup" timestamp.
4. Open that folder in File Explorer — confirm `logbook-backup.csv` exists
   and open it (e.g. in Notepad or Excel) to confirm it has the header row
   and no data rows yet.

- [ ] **Step 3: Verify backups update on every change**

1. Add a flight entry through the form.
2. Re-open `logbook-backup.csv` — confirm the new row appears and the "Last
   backup" timestamp in the app updated.
3. Edit that entry (change a field, e.g. remarks) and re-check the CSV
   reflects the change.
4. Delete the entry and re-check the CSV is back to header-only.

- [ ] **Step 4: Verify restore**

1. Add two or three flight entries.
2. Note the current entry count shown in the totals section.
3. Click **Restore from backup**, pick the `logbook-backup.csv` from an
   earlier point (or manually create a small valid backup CSV with 1-2 rows
   using the exact header from Task 2 to restore a known, different set).
4. Confirm the browser dialog shows the correct current/incoming counts,
   click OK, and confirm the flight list now matches the restored file.
5. Try picking a random unrelated CSV file (wrong header) and confirm the
   app shows an error and does not touch existing data.

- [ ] **Step 5: Verify graceful degradation on unsupported browsers (optional but recommended)**

If you have Safari or Firefox available, open the same preview URL there and
confirm the Backup section shows "Backup requires Chrome or Edge on Windows"
instead of a broken button, and that **Restore from backup** still works.

- [ ] **Step 6: Stop the preview server**

Press Ctrl+C in the terminal running `npm run preview`.

---

## Self-Review Notes

- **Spec coverage:** Backup write flow (folder connect, permission check,
  CSV regeneration on every mutation, error/status tracking) — Tasks 1, 3,
  4, 7. CSV format (exact column order, RFC 4180 quoting) — Task 2. Restore
  flow (file picker, header validation, confirmation, replace-all with fresh
  ids) — Tasks 5, 6, 7. Feature detection for unsupported browsers — Task 4
  (`isBackupSupported`) surfaced through Task 6's component. Settings table
  as a generic key/value store — Task 1. Out-of-scope items (cross-device
  sync, Safelog import, dated snapshots) are correctly not implemented
  anywhere in this plan.
- **Type consistency:** `BackupStatus` is defined once in `backupWriter.ts`
  (Task 4) and consumed identically by `BackupSettings.tsx` (Task 6) and
  `App.tsx` (Task 7). `SettingKey`/`SettingRecord` (Task 1) are used
  consistently by `settings.ts`, `backupWriter.ts`, and `db.ts`. The CSV
  `HEADER` order (Task 2) matches `FlightEntry`'s field order used
  throughout.
- **No placeholders:** all steps contain complete, runnable code and exact
  commands.
