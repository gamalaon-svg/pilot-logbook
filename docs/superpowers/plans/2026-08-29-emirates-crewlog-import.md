# Emirates CrewLog Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Gamal import his Emirates crew portal "Flight Time Report" (`.xlsx`) directly into the app — mapping columns, computing real night time from airport coordinates and sun position, determining his role per flight from the crew list, and safely skipping flights he's already imported — so this becomes his ongoing way of keeping the logbook current.

**Architecture:** A new `src/import/` module handles everything: parsing the `.xlsx` (via SheetJS), mapping rows to `FlightEntry` objects, computing night time (via `suncalc` + a bundled airport-coordinates dataset), and duplicate-safe import orchestration. Also: add an optional `flightNumber` field to the data model, and add Export/relabel Import in the existing Backup view (small, unrelated cleanup bundled in since it touches the same UI).

**Tech Stack:** Existing stack plus two new dependencies: `xlsx` (SheetJS, reads the Excel file client-side) and `suncalc` (+ `@types/suncalc`) for sun-position calculations.

---

## File Structure

```
src/
  types/
    flightEntry.ts                 (modified: add optional flightNumber)
  backup/
    csv.ts                         (modified: flightNumber in HEADER, undefined-safe csvField)
    csv.test.ts                    (modified)
    downloadCsv.ts                 (new: on-demand CSV download)
    downloadCsv.test.ts            (new)
  components/
    FlightEntryForm.tsx            (modified: flight number input)
    FlightEntryForm.test.tsx       (modified)
    FlightEntryList.tsx            (modified: flight number column)
    FlightEntryList.test.tsx       (modified)
    BackupSettings.tsx             (modified: Export button, Import relabel, Emirates import input)
    BackupSettings.test.tsx        (modified)
  import/
    airports.json                  (new: bundled IATA code -> [lat, lon] data)
    airports.ts                    (new: coordinate lookup)
    airports.test.ts               (new)
    nightTime.ts                   (new: day/night split calculation)
    nightTime.test.ts              (new)
    emiratesParser.ts              (new: .xlsx -> raw rows)
    emiratesParser.test.ts         (new)
    emiratesMapping.ts             (new: raw row -> FlightEntry)
    emiratesMapping.test.ts        (new)
    emiratesImport.ts              (new: preview + commit, duplicate detection)
    emiratesImport.test.ts         (new)
  App.tsx                          (modified: wire Export, Import relabel, Emirates import)
  App.test.tsx                     (modified)
```

---

### Task 1: Add `flightNumber` field to the data model

**Files:**
- Modify: `src/types/flightEntry.ts`
- Modify: `src/components/FlightEntryForm.tsx`
- Modify: `src/components/FlightEntryForm.test.tsx`
- Modify: `src/components/FlightEntryList.tsx`
- Modify: `src/components/FlightEntryList.test.tsx`
- Modify: `src/backup/csv.ts`
- Modify: `src/backup/csv.test.ts`

- [ ] **Step 1: Add the field to the type**

In `src/types/flightEntry.ts`, change:

```ts
export interface FlightEntry {
  id?: number;
  date: string; // ISO "YYYY-MM-DD"
  departure: string;
  arrival: string;
  aircraftType: string;
```

to:

```ts
export interface FlightEntry {
  id?: number;
  date: string; // ISO "YYYY-MM-DD"
  departure: string;
  arrival: string;
  flightNumber?: string;
  aircraftType: string;
```

- [ ] **Step 2: Write the failing CSV test**

In `src/backup/csv.test.ts`, add `flightNumber: "EK0839",` to `sampleEntry` (right after `arrival: "EGLL",`), update the two expected strings in the first test, and add two new tests. Replace the full contents of the file:

```ts
import { describe, expect, it } from "vitest";
import { CsvFormatError, flightEntriesToCsv, parseFlightEntriesCsv } from "./csv";
import type { FlightEntry } from "../types/flightEntry";

const sampleEntry: FlightEntry = {
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
  remarks: "Great flight"
};

describe("flightEntriesToCsv", () => {
  it("writes a header row and one data row", () => {
    const csv = flightEntriesToCsv([sampleEntry]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "date,departure,arrival,flightNumber,aircraftType,aircraftRegistration,blockOffTime,blockOnTime,totalTimeMinutes,role,dayTimeMinutes,nightTimeMinutes,ifrTimeMinutes,vfrTimeMinutes,crossCountryTimeMinutes,landingsDay,landingsNight,approaches,remarks"
    );
    expect(lines[1]).toBe(
      "2026-08-20,OMDB,EGLL,EK0839,B777,A6-EXAMPLE,08:00,15:30,450,PIC,450,0,450,0,450,1,0,ILS x1,Great flight"
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

  it("writes an empty field when flightNumber is not set", () => {
    const { flightNumber, ...rest } = sampleEntry;
    const csv = flightEntriesToCsv([rest as FlightEntry]);
    expect(csv.split("\n")[1]).toBe(
      "2026-08-20,OMDB,EGLL,,B777,A6-EXAMPLE,08:00,15:30,450,PIC,450,0,450,0,450,1,0,ILS x1,Great flight"
    );
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

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/backup/csv.test.ts`
Expected: FAIL — header string doesn't include `flightNumber` yet, and `csvField`
called with `undefined` would currently render the literal text `undefined`.

- [ ] **Step 4: Update csv.ts**

In `src/backup/csv.ts`, change the `HEADER` array:

```ts
const HEADER = [
  "date",
  "departure",
  "arrival",
  "flightNumber",
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
```

and change `csvField` to accept and handle `undefined`:

```ts
function csvField(value: string | number | undefined): string {
  const str = String(value ?? "");
  if (/["\n,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/backup/csv.test.ts`
Expected: PASS, all 9 tests green.

- [ ] **Step 6: Write the failing form test**

In `src/components/FlightEntryForm.test.tsx`, add `await user.type(screen.getByLabelText(/flight number/i), "EK0839");`
right after the `arrival` line in the first test, and add `flightNumber: "EK0839"` to the `expect.objectContaining` call. Replace the full contents of the file:

```tsx
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
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- src/components/FlightEntryForm.test.tsx`
Expected: FAIL — no "Flight number" label exists yet.

- [ ] **Step 8: Add the field to the form**

In `src/components/FlightEntryForm.tsx`, `FormState` is `Omit<FlightEntry, ...>` plus string overrides for the numeric fields — `flightNumber` stays a plain optional string, so no changes are needed to the `FormState` type itself (it already includes `flightNumber?: string` via `Omit`). Change `emptyState`:

```ts
function emptyState(initial?: FlightEntry): FormState {
  return {
    id: initial?.id,
    date: initial?.date ?? "",
    departure: initial?.departure ?? "",
    arrival: initial?.arrival ?? "",
    flightNumber: initial?.flightNumber ?? "",
    aircraftType: initial?.aircraftType ?? "",
```

Change the entry construction inside `handleSubmit`:

```ts
      const entry: FlightEntry = {
        id: form.id,
        date: form.date,
        departure: form.departure,
        arrival: form.arrival,
        flightNumber: form.flightNumber.trim() || undefined,
        aircraftType: form.aircraftType,
```

Add the input, right after the "Arrival" field:

```tsx
      <label htmlFor="arrival">Arrival</label>
      <input id="arrival" type="text" value={form.arrival} onChange={handleChange("arrival")} />

      <label htmlFor="flightNumber">Flight number</label>
      <input id="flightNumber" type="text" value={form.flightNumber ?? ""} onChange={handleChange("flightNumber")} />

      <label htmlFor="aircraftType">Aircraft type</label>
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- src/components/FlightEntryForm.test.tsx`
Expected: PASS, both tests green.

- [ ] **Step 10: Write the failing list test**

In `src/components/FlightEntryList.test.tsx`, add `flightNumber: "EK0839",` to the sample entry
(right after `arrival: "EGLL",`) and add an assertion. Replace the full contents of the file:

```tsx
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
```

- [ ] **Step 11: Run test to verify it fails**

Run: `npm test -- src/components/FlightEntryList.test.tsx`
Expected: FAIL — `EK0839` isn't rendered anywhere yet.

- [ ] **Step 12: Add the column**

Replace the full contents of `src/components/FlightEntryList.tsx`:

```tsx
import { FlightEntry } from "../types/flightEntry";
import { formatMinutes } from "../utils/time";

interface FlightEntryListProps {
  entries: FlightEntry[];
  onEdit: (entry: FlightEntry) => void;
  onDelete: (id: number) => void;
}

export function FlightEntryList({ entries, onEdit, onDelete }: FlightEntryListProps) {
  if (entries.length === 0) {
    return <p>No flight entries yet.</p>;
  }

  return (
    <div className="logbook-table-wrap">
      <table className="logbook-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Flight #</th>
            <th>Aircraft</th>
            <th>Total time</th>
            <th>Role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.date}</td>
              <td>{entry.departure}</td>
              <td>{entry.arrival}</td>
              <td>{entry.flightNumber}</td>
              <td>{entry.aircraftType}</td>
              <td>{formatMinutes(entry.totalTimeMinutes)}</td>
              <td>{entry.role}</td>
              <td>
                <button type="button" onClick={() => onEdit(entry)}>
                  Edit
                </button>
                <button type="button" onClick={() => entry.id !== undefined && onDelete(entry.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npm test -- src/components/FlightEntryList.test.tsx`
Expected: PASS, all 3 tests green.

- [ ] **Step 14: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file green (App.test.tsx and TotalsSummary/StatCards tests don't
reference flightNumber so are unaffected).

- [ ] **Step 15: Commit**

```bash
git add src/types/flightEntry.ts src/backup/csv.ts src/backup/csv.test.ts src/components/FlightEntryForm.tsx src/components/FlightEntryForm.test.tsx src/components/FlightEntryList.tsx src/components/FlightEntryList.test.tsx
git commit -m "feat: add optional flight number field"
```

---

### Task 2: Export button and Import relabel

**Files:**
- Create: `src/backup/downloadCsv.ts`
- Test: `src/backup/downloadCsv.test.ts`
- Modify: `src/components/BackupSettings.tsx`
- Modify: `src/components/BackupSettings.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test for the download helper**

```ts
// src/backup/downloadCsv.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCsv } from "./downloadCsv";

describe("downloadCsv", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a download link with the given filename and clicks it", () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        element.click = clickSpy;
      }
      return element;
    });

    downloadCsv("logbook-export.csv", "date,departure\n2026-08-20,OMDB");

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/backup/downloadCsv.test.ts`
Expected: FAIL — `Cannot find module './downloadCsv'`.

- [ ] **Step 3: Implement the helper**

```ts
// src/backup/downloadCsv.ts
export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/backup/downloadCsv.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing BackupSettings tests**

Replace the full contents of `src/components/BackupSettings.test.tsx`:

```tsx
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
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test -- src/components/BackupSettings.test.tsx`
Expected: FAIL — `onExport`/`onEmiratesImportFile` props don't exist yet, "Export" button
and "Import Emirates report" input aren't rendered, and the label is still "Restore from backup"
not "Import".

- [ ] **Step 7: Update the component**

Replace the full contents of `src/components/BackupSettings.tsx`:

```tsx
import { ChangeEvent } from "react";
import type { BackupStatus } from "../backup/backupWriter";

interface BackupSettingsProps {
  status: BackupStatus;
  onConnect: () => void;
  onRestoreFile: (file: File) => void;
  onExport: () => void;
  onEmiratesImportFile: (file: File) => void;
}

export function BackupSettings({
  status,
  onConnect,
  onRestoreFile,
  onExport,
  onEmiratesImportFile
}: BackupSettingsProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onRestoreFile(file);
    }
    event.target.value = "";
  }

  function handleEmiratesFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onEmiratesImportFile(file);
    }
    event.target.value = "";
  }

  return (
    <section className="backup-settings">
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
      <button type="button" onClick={onExport}>
        Export
      </button>
      <label htmlFor="restoreFile">Import</label>
      <input id="restoreFile" type="file" accept=".csv" onChange={handleFileChange} />
      <label htmlFor="emiratesImportFile">Import Emirates report</label>
      <input id="emiratesImportFile" type="file" accept=".xlsx" onChange={handleEmiratesFileChange} />
    </section>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- src/components/BackupSettings.test.tsx`
Expected: PASS, all 7 tests green.

- [ ] **Step 9: Wire onExport into App.tsx**

In `src/App.tsx`, add an import:

```ts
import { flightEntriesToCsv } from "./backup/csv";
import { downloadCsv } from "./backup/downloadCsv";
```

Add a handler (near `handleConnect`):

```ts
  function handleExport() {
    const csv = flightEntriesToCsv(entries);
    downloadCsv(`logbook-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }
```

Pass it to the component (the `onEmiratesImportFile` prop is wired in Task 9 — for now, pass a
temporary no-op so the app compiles):

```tsx
            <BackupSettings
              status={backupStatus}
              onConnect={handleConnect}
              onRestoreFile={handleRestoreFile}
              onExport={handleExport}
              onEmiratesImportFile={() => {}}
            />
```

- [ ] **Step 10: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 11: Commit**

```bash
git add src/backup/downloadCsv.ts src/backup/downloadCsv.test.ts src/components/BackupSettings.tsx src/components/BackupSettings.test.tsx src/App.tsx
git commit -m "feat: add CSV export and relabel restore as import"
```

---

### Task 3: Dependencies and airport coordinates dataset

**Files:**
- Modify: `package.json` (via `npm install`)
- Create: `src/import/airports.json`

- [ ] **Step 1: Install the new dependencies**

```bash
npm install xlsx suncalc
npm install -D @types/suncalc
```

- [ ] **Step 2: Generate the airport coordinates dataset**

This downloads OurAirports' public dataset, filters it to large/medium airports with an IATA
code, and writes a compact lookup file. Run once — the output gets committed to git like any
other source file, this isn't a build step that runs on every install.

```bash
mkdir -p src/import
curl -s -o airports_raw.csv "https://davidmegginson.github.io/ourairports-data/airports.csv"
python -c "
import pandas as pd
import json
df = pd.read_csv('airports_raw.csv')
scheduled = df[(df['iata_code'].notna()) & (df['iata_code'] != '') & (df['type'].isin(['large_airport', 'medium_airport']))]
airports = {}
for _, row in scheduled.iterrows():
    code = row['iata_code']
    if code not in airports:
        airports[code] = [round(float(row['latitude_deg']), 4), round(float(row['longitude_deg']), 4)]
with open('src/import/airports.json', 'w') as f:
    json.dump(airports, f, separators=(',', ':'))
print('wrote', len(airports), 'airports')
"
rm airports_raw.csv
```

Expected output: `wrote 4570 airports` (approximately — the exact count may drift slightly as
OurAirports' data is updated, that's fine).

- [ ] **Step 3: Verify it type-checks and the file looks right**

Run: `npx tsc -b`
Expected: no errors (this step has no code referencing the new file yet, just confirms nothing
broke).

Run: `node -e "const a = require('./src/import/airports.json'); console.log(a.DXB, a.LHR, Object.keys(a).length)"`
Expected: prints DXB's and LHR's `[lat, lon]` pairs and a count in the low thousands — confirms
the file is valid JSON with real-looking data.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/import/airports.json
git commit -m "chore: add xlsx/suncalc dependencies and bundled airport coordinates"
```

---

### Task 4: Airport coordinate lookup

**Files:**
- Create: `src/import/airports.ts`
- Test: `src/import/airports.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/import/airports.test.ts
import { describe, expect, it } from "vitest";
import { getAirportCoordinates } from "./airports";

describe("getAirportCoordinates", () => {
  it("returns coordinates for a known airport", () => {
    const coords = getAirportCoordinates("DXB");
    expect(coords).toBeDefined();
    expect(coords!.latitude).toBeGreaterThan(24);
    expect(coords!.latitude).toBeLessThan(26);
    expect(coords!.longitude).toBeGreaterThan(54);
    expect(coords!.longitude).toBeLessThan(57);
  });

  it("returns undefined for an unknown code", () => {
    expect(getAirportCoordinates("ZZZZ")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/import/airports.test.ts`
Expected: FAIL — `Cannot find module './airports'`.

- [ ] **Step 3: Implement the loader**

```ts
// src/import/airports.ts
import airportsData from "./airports.json";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const AIRPORTS = airportsData as Record<string, [number, number]>;

export function getAirportCoordinates(iataCode: string): Coordinates | undefined {
  const entry = AIRPORTS[iataCode];
  if (!entry) {
    return undefined;
  }
  return { latitude: entry[0], longitude: entry[1] };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/import/airports.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/import/airports.ts src/import/airports.test.ts
git commit -m "feat: add airport coordinate lookup"
```

---

### Task 5: Night-time calculation

**Files:**
- Create: `src/import/nightTime.ts`
- Test: `src/import/nightTime.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/import/nightTime.test.ts
import { describe, expect, it } from "vitest";
import { computeNightTime } from "./nightTime";

describe("computeNightTime", () => {
  it("returns undefined when an airport isn't in the database", () => {
    const result = computeNightTime("ZZZZ", "DXB", new Date("2026-06-15T10:00:00Z"), 60);
    expect(result).toBeUndefined();
  });

  it("computes all-day time for a short midday flight", () => {
    const result = computeNightTime("DXB", "BAH", new Date("2026-06-15T08:00:00Z"), 60);
    expect(result).toBeDefined();
    expect(result!.nightMinutes).toBe(0);
    expect(result!.dayMinutes).toBe(60);
    expect(result!.isArrivalNight).toBe(false);
  });

  it("computes night time for a short flight in the middle of the local night", () => {
    const result = computeNightTime("DXB", "BAH", new Date("2026-06-15T20:00:00Z"), 60);
    expect(result).toBeDefined();
    expect(result!.nightMinutes).toBeGreaterThan(0);
    expect(result!.isArrivalNight).toBe(true);
  });

  it("day and night minutes always sum to the flight's total time", () => {
    const result = computeNightTime("DXB", "LHR", new Date("2026-01-15T16:00:00Z"), 420);
    expect(result).toBeDefined();
    expect(result!.nightMinutes + result!.dayMinutes).toBe(420);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/import/nightTime.test.ts`
Expected: FAIL — `Cannot find module './nightTime'`.

- [ ] **Step 3: Implement the calculation**

```ts
// src/import/nightTime.ts
import SunCalc from "suncalc";
import { getAirportCoordinates } from "./airports";

const CIVIL_TWILIGHT_ALTITUDE_DEGREES = -6;

function isNight(date: Date, latitude: number, longitude: number): boolean {
  const { altitude } = SunCalc.getPosition(date, latitude, longitude);
  const altitudeDegrees = (altitude * 180) / Math.PI;
  return altitudeDegrees < CIVIL_TWILIGHT_ALTITUDE_DEGREES;
}

function interpolate(a: number, b: number, fraction: number): number {
  return a + (b - a) * fraction;
}

export interface NightTimeResult {
  nightMinutes: number;
  dayMinutes: number;
  isArrivalNight: boolean;
}

export function computeNightTime(
  departureIata: string,
  arrivalIata: string,
  departureUtc: Date,
  totalMinutes: number
): NightTimeResult | undefined {
  const departureCoords = getAirportCoordinates(departureIata);
  const arrivalCoords = getAirportCoordinates(arrivalIata);
  if (!departureCoords || !arrivalCoords) {
    return undefined;
  }

  const sampleCount = Math.max(2, Math.round(totalMinutes / 5));
  let nightSamples = 0;

  for (let i = 0; i <= sampleCount; i += 1) {
    const fraction = i / sampleCount;
    const sampleTime = new Date(departureUtc.getTime() + fraction * totalMinutes * 60_000);
    const latitude = interpolate(departureCoords.latitude, arrivalCoords.latitude, fraction);
    const longitude = interpolate(departureCoords.longitude, arrivalCoords.longitude, fraction);
    if (isNight(sampleTime, latitude, longitude)) {
      nightSamples += 1;
    }
  }

  const nightMinutes = Math.round((nightSamples / (sampleCount + 1)) * totalMinutes);
  const arrivalTime = new Date(departureUtc.getTime() + totalMinutes * 60_000);
  const isArrivalNight = isNight(arrivalTime, arrivalCoords.latitude, arrivalCoords.longitude);

  return {
    nightMinutes,
    dayMinutes: totalMinutes - nightMinutes,
    isArrivalNight
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/import/nightTime.test.ts`
Expected: PASS, all 4 tests green. If the "middle of the local night" test fails, double-check
that `20:00Z` really is nighttime at DXB (UTC+4, so `00:00` local) — adjust the test's UTC hour
rather than the implementation if the arithmetic was off.

- [ ] **Step 5: Commit**

```bash
git add src/import/nightTime.ts src/import/nightTime.test.ts
git commit -m "feat: add night-time calculation from sun position"
```

---

### Task 6: Emirates file parser

**Files:**
- Create: `src/import/emiratesParser.ts`
- Test: `src/import/emiratesParser.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/import/emiratesParser.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseEmiratesFile } from "./emiratesParser";

function makeEmiratesFile(rows: unknown[][]): File {
  const preamble = [
    ["Flight Time Report"],
    ["CA - GAMAL OUN #406191"],
    ["From:", "26-Oct-2010"],
    ["To:", "28-Aug-2026"]
  ];
  const columnHeader = [
    "Flight Date",
    "A/C Type",
    "Flt No",
    "A/C Reg",
    "From",
    "To",
    "ATD",
    "ATA",
    "Block",
    "Stick",
    "Take off",
    "Landing",
    "SDC",
    "Crew Name",
    "DE Time"
  ];
  const sheet = XLSX.utils.aoa_to_sheet([...preamble, [], columnHeader, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "CrewLogReports");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer], "CrewLogReports.xlsx");
}

const sampleRow = [
  "26-MAY-2011",
  "A33",
  "0839",
  "A6EAR",
  "DXB",
  "BAH",
  "12:28",
  "13:39",
  "1:11",
  "1:11",
  "",
  "",
  "O",
  "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)",
  ""
];

describe("parseEmiratesFile", () => {
  it("skips the report header and parses data rows", async () => {
    const file = makeEmiratesFile([sampleRow]);

    const rows = await parseEmiratesFile(file);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      flightDate: "26-MAY-2011",
      aircraftType: "A33",
      flightNumber: "0839",
      aircraftRegistration: "A6EAR",
      from: "DXB",
      to: "BAH",
      atd: "12:28",
      ata: "13:39",
      block: "1:11",
      landing: "",
      crewName: "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)"
    });
  });

  it("throws when the file doesn't look like an Emirates report", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([["not", "the", "right", "format"]]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const file = new File([buffer], "random.xlsx");

    await expect(parseEmiratesFile(file)).rejects.toThrow(/could not find/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/import/emiratesParser.test.ts`
Expected: FAIL — `Cannot find module './emiratesParser'`.

- [ ] **Step 3: Implement the parser**

```ts
// src/import/emiratesParser.ts
import * as XLSX from "xlsx";

export interface RawEmiratesRow {
  flightDate: string;
  aircraftType: string;
  flightNumber: string;
  aircraftRegistration: string;
  from: string;
  to: string;
  atd: string;
  ata: string;
  block: string;
  landing: string;
  crewName: string;
}

const HEADER_MARKER = "Flight Date";

export async function parseEmiratesFile(file: File): Promise<RawEmiratesRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  const headerIndex = rows.findIndex((row) => row[0] === HEADER_MARKER);
  if (headerIndex === -1) {
    throw new Error("Could not find the Emirates report's column headers in this file");
  }

  const dataRows = rows.slice(headerIndex + 1).filter((row) => row[0]);

  return dataRows.map((row) => ({
    flightDate: String(row[0] ?? ""),
    aircraftType: String(row[1] ?? ""),
    flightNumber: String(row[2] ?? ""),
    aircraftRegistration: String(row[3] ?? ""),
    from: String(row[4] ?? ""),
    to: String(row[5] ?? ""),
    atd: String(row[6] ?? ""),
    ata: String(row[7] ?? ""),
    block: String(row[8] ?? ""),
    landing: String(row[11] ?? ""),
    crewName: String(row[13] ?? "")
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/import/emiratesParser.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/import/emiratesParser.ts src/import/emiratesParser.test.ts
git commit -m "feat: add Emirates report file parser"
```

---

### Task 7: Emirates row mapping

**Files:**
- Create: `src/import/emiratesMapping.ts`
- Test: `src/import/emiratesMapping.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/import/emiratesMapping.test.ts
import { describe, expect, it } from "vitest";
import { findPilotRole, mapAircraftType, mapEmiratesRow, parseEmiratesDate } from "./emiratesMapping";
import type { RawEmiratesRow } from "./emiratesParser";

describe("parseEmiratesDate", () => {
  it("converts DD-MMM-YYYY to ISO", () => {
    expect(parseEmiratesDate("26-MAY-2011")).toBe("2011-05-26");
  });

  it("throws on an unrecognized format", () => {
    expect(() => parseEmiratesDate("2011-05-26")).toThrow();
  });
});

describe("mapAircraftType", () => {
  it("maps known codes", () => {
    expect(mapAircraftType("A33")).toBe("A330");
    expect(mapAircraftType("380")).toBe("A380");
    expect(mapAircraftType("388")).toBe("A380");
  });

  it("passes through unknown codes unchanged", () => {
    expect(mapAircraftType("B77")).toBe("B77");
  });
});

describe("findPilotRole", () => {
  const crewName = "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)";

  it("finds PIC for a Captain entry", () => {
    expect(findPilotRole(crewName, "143824")).toBe("PIC");
  });

  it("finds SIC for a First Officer entry", () => {
    expect(findPilotRole(crewName, "406191")).toBe("SIC");
  });

  it("returns undefined when the license number isn't in the crew list", () => {
    expect(findPilotRole(crewName, "999999")).toBeUndefined();
  });
});

describe("mapEmiratesRow", () => {
  const baseRow: RawEmiratesRow = {
    flightDate: "26-MAY-2011",
    aircraftType: "A33",
    flightNumber: "0839",
    aircraftRegistration: "A6EAR",
    from: "DXB",
    to: "BAH",
    atd: "12:28",
    ata: "13:39",
    block: "1:11",
    landing: "",
    crewName: "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)"
  };

  it("maps a row to a FlightEntry", () => {
    const entry = mapEmiratesRow(baseRow, { pilotLicenseNumber: "406191" });

    expect(entry.date).toBe("2011-05-26");
    expect(entry.departure).toBe("DXB");
    expect(entry.arrival).toBe("BAH");
    expect(entry.flightNumber).toBe("0839");
    expect(entry.aircraftType).toBe("A330");
    expect(entry.role).toBe("SIC");
    expect(entry.totalTimeMinutes).toBe(71);
    expect(entry.dayTimeMinutes + entry.nightTimeMinutes).toBe(71);
    expect(entry.ifrTimeMinutes).toBe(71);
    expect(entry.crossCountryTimeMinutes).toBe(71);
    expect(entry.vfrTimeMinutes).toBe(0);
    expect(entry.landingsDay + entry.landingsNight).toBe(0);
  });

  it("counts a landing when Landing is Y", () => {
    const entry = mapEmiratesRow({ ...baseRow, landing: "Y" }, { pilotLicenseNumber: "406191" });
    expect(entry.landingsDay + entry.landingsNight).toBe(1);
  });

  it("throws when the pilot isn't found in the crew list", () => {
    expect(() => mapEmiratesRow(baseRow, { pilotLicenseNumber: "000000" })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/import/emiratesMapping.test.ts`
Expected: FAIL — `Cannot find module './emiratesMapping'`.

- [ ] **Step 3: Implement the mapping**

```ts
// src/import/emiratesMapping.ts
import type { CrewRole, FlightEntry } from "../types/flightEntry";
import { parseHHMM } from "../utils/time";
import { computeNightTime } from "./nightTime";
import type { RawEmiratesRow } from "./emiratesParser";

const AIRCRAFT_TYPE_MAP: Record<string, string> = {
  A33: "A330",
  "380": "A380",
  "388": "A380"
};

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12"
};

export function parseEmiratesDate(value: string): string {
  const match = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec(value.trim().toUpperCase());
  if (!match) {
    throw new Error(`Unrecognized date "${value}", expected DD-MMM-YYYY`);
  }
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName];
  if (!month) {
    throw new Error(`Unrecognized month in date "${value}"`);
  }
  return `${year}-${month}-${day}`;
}

export function mapAircraftType(code: string): string {
  return AIRCRAFT_TYPE_MAP[code] ?? code;
}

export function findPilotRole(crewName: string, pilotLicenseNumber: string): CrewRole | undefined {
  const match = new RegExp(`\\(${pilotLicenseNumber}-([A-Z]+)\\)`).exec(crewName);
  if (!match) {
    return undefined;
  }
  const rank = match[1];
  if (rank === "CA") {
    return "PIC";
  }
  if (rank === "FO") {
    return "SIC";
  }
  return undefined;
}

export interface MapRowOptions {
  pilotLicenseNumber: string;
}

export function mapEmiratesRow(row: RawEmiratesRow, options: MapRowOptions): FlightEntry {
  const role = findPilotRole(row.crewName, options.pilotLicenseNumber);
  if (!role) {
    throw new Error(`Could not determine role for flight ${row.flightNumber} on ${row.flightDate}`);
  }

  const date = parseEmiratesDate(row.flightDate);
  const totalTimeMinutes = parseHHMM(row.block);
  const departureUtc = new Date(`${date}T${row.atd}:00Z`);
  const nightResult = computeNightTime(row.from, row.to, departureUtc, totalTimeMinutes);
  const nightMinutes = nightResult?.nightMinutes ?? 0;
  const dayMinutes = totalTimeMinutes - nightMinutes;
  const landed = row.landing.trim().toUpperCase() === "Y";
  const landedAtNight = landed && (nightResult?.isArrivalNight ?? false);

  return {
    date,
    departure: row.from,
    arrival: row.to,
    flightNumber: row.flightNumber || undefined,
    aircraftType: mapAircraftType(row.aircraftType),
    aircraftRegistration: row.aircraftRegistration,
    blockOffTime: row.atd,
    blockOnTime: row.ata,
    totalTimeMinutes,
    role,
    dayTimeMinutes: dayMinutes,
    nightTimeMinutes: nightMinutes,
    ifrTimeMinutes: totalTimeMinutes,
    vfrTimeMinutes: 0,
    crossCountryTimeMinutes: totalTimeMinutes,
    landingsDay: landed && !landedAtNight ? 1 : 0,
    landingsNight: landedAtNight ? 1 : 0,
    approaches: "",
    remarks: ""
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/import/emiratesMapping.test.ts`
Expected: PASS, all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/import/emiratesMapping.ts src/import/emiratesMapping.test.ts
git commit -m "feat: add Emirates row-to-FlightEntry mapping"
```

---

### Task 8: Duplicate-safe import orchestration

**Files:**
- Create: `src/import/emiratesImport.ts`
- Test: `src/import/emiratesImport.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/import/emiratesImport.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { LogbookDatabase } from "../db/db";
import { getAllFlightEntries } from "../db/flightEntries";
import { commitEmiratesImport, prepareEmiratesImport } from "./emiratesImport";

function makeEmiratesFile(rows: unknown[][]): File {
  const preamble = [
    ["Flight Time Report"],
    ["CA - GAMAL OUN #406191"],
    ["From:", "26-Oct-2010"],
    ["To:", "28-Aug-2026"]
  ];
  const columnHeader = [
    "Flight Date",
    "A/C Type",
    "Flt No",
    "A/C Reg",
    "From",
    "To",
    "ATD",
    "ATA",
    "Block",
    "Stick",
    "Take off",
    "Landing",
    "SDC",
    "Crew Name",
    "DE Time"
  ];
  const sheet = XLSX.utils.aoa_to_sheet([...preamble, [], columnHeader, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "CrewLogReports");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer], "CrewLogReports.xlsx");
}

const sampleRow = [
  "26-MAY-2011",
  "A33",
  "0839",
  "A6EAR",
  "DXB",
  "BAH",
  "12:28",
  "13:39",
  "1:11",
  "1:11",
  "",
  "",
  "O",
  "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)",
  ""
];

describe("prepareEmiratesImport / commitEmiratesImport", () => {
  it("adds all flights as new on a first import into an empty logbook", async () => {
    const db = new LogbookDatabase(`emirates-import-test-db-${Math.random()}`);
    await db.open();
    const file = makeEmiratesFile([sampleRow]);

    const preview = await prepareEmiratesImport(db, file, "406191");
    expect(preview.newEntries).toHaveLength(1);
    expect(preview.duplicateCount).toBe(0);
    expect(preview.totalInFile).toBe(1);

    await commitEmiratesImport(db, preview.newEntries);
    const stored = await getAllFlightEntries(db);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ date: "2011-05-26", departure: "DXB", arrival: "BAH" });
  });

  it("skips a flight that's already been imported", async () => {
    const db = new LogbookDatabase(`emirates-import-test-db-${Math.random()}`);
    await db.open();
    const file = makeEmiratesFile([sampleRow]);

    const firstPreview = await prepareEmiratesImport(db, file, "406191");
    await commitEmiratesImport(db, firstPreview.newEntries);

    const secondPreview = await prepareEmiratesImport(db, file, "406191");
    expect(secondPreview.newEntries).toHaveLength(0);
    expect(secondPreview.duplicateCount).toBe(1);

    const stored = await getAllFlightEntries(db);
    expect(stored).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/import/emiratesImport.test.ts`
Expected: FAIL — `Cannot find module './emiratesImport'`.

- [ ] **Step 3: Implement the orchestration**

```ts
// src/import/emiratesImport.ts
import type { LogbookDatabase } from "../db/db";
import { addFlightEntry, getAllFlightEntries } from "../db/flightEntries";
import type { FlightEntry } from "../types/flightEntry";
import { parseEmiratesFile } from "./emiratesParser";
import { mapEmiratesRow } from "./emiratesMapping";

function fingerprint(entry: FlightEntry): string {
  return [entry.date, entry.departure, entry.arrival, entry.blockOffTime, entry.flightNumber ?? ""].join("|");
}

export interface EmiratesImportPreview {
  newEntries: FlightEntry[];
  duplicateCount: number;
  totalInFile: number;
}

export async function prepareEmiratesImport(
  db: LogbookDatabase,
  file: File,
  pilotLicenseNumber: string
): Promise<EmiratesImportPreview> {
  const rawRows = await parseEmiratesFile(file);
  const mappedEntries = rawRows.map((row) => mapEmiratesRow(row, { pilotLicenseNumber }));

  const existingEntries = await getAllFlightEntries(db);
  const existingFingerprints = new Set(existingEntries.map(fingerprint));

  const newEntries = mappedEntries.filter((entry) => !existingFingerprints.has(fingerprint(entry)));
  const duplicateCount = mappedEntries.length - newEntries.length;

  return { newEntries, duplicateCount, totalInFile: mappedEntries.length };
}

export async function commitEmiratesImport(db: LogbookDatabase, newEntries: FlightEntry[]): Promise<void> {
  for (const entry of newEntries) {
    await addFlightEntry(db, entry);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/import/emiratesImport.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/import/emiratesImport.ts src/import/emiratesImport.test.ts
git commit -m "feat: add duplicate-safe Emirates import orchestration"
```

---

### Task 9: Wire the Emirates importer into the UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

The Backup view's "Import Emirates report" control already renders from Task 2 (wired to a
no-op), so a test that only checks the control exists wouldn't actually fail here — it needs to
verify real behavior. Mock the `import/emiratesImport` module (same pattern already used for
`db/settings` and `db/flightEntries` in `backupWriter.test.ts`) so this test doesn't depend on
real `.xlsx` parsing, and check that uploading a file actually calls the import functions and
that a confirmed import is committed.

Add these imports near the top of `src/App.test.tsx` (alongside the existing ones):

```tsx
import { commitEmiratesImport, prepareEmiratesImport } from "./import/emiratesImport";
```

Add this line right after the imports, before `describe("App", ...)`:

```tsx
vi.mock("./import/emiratesImport");
```

Change the first import line from `import { describe, expect, it } from "vitest";` to
`import { describe, expect, it, vi } from "vitest";`.

Add this test to the existing `describe("App", ...)` block (keep the other tests as-is):

```tsx
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
    expect(commitEmiratesImport).toHaveBeenCalledWith(expect.anything(), [newEntry]);

    vi.restoreAllMocks();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — `onEmiratesImportFile` is currently wired to a no-op, so `prepareEmiratesImport`
is never called.

- [ ] **Step 3: Wire real behavior into App.tsx**

Add imports:

```ts
import { commitEmiratesImport, prepareEmiratesImport } from "./import/emiratesImport";
```

Add a constant near the top of the file (above the `App` component):

```ts
const EMIRATES_PILOT_LICENSE_NUMBER = "406191";
```

Add a handler (near `handleRestoreFile`):

```ts
  async function handleEmiratesImportFile(file: File) {
    let preview: Awaited<ReturnType<typeof prepareEmiratesImport>>;
    try {
      preview = await prepareEmiratesImport(db, file, EMIRATES_PILOT_LICENSE_NUMBER);
    } catch (err) {
      window.alert(`Could not read Emirates report: ${(err as Error).message}`);
      return;
    }
    if (preview.newEntries.length === 0) {
      window.alert(`No new flights found. ${preview.totalInFile} flights in file, all already in your logbook.`);
      return;
    }
    const confirmed = window.confirm(
      `${preview.totalInFile} flights found in file, ${preview.newEntries.length} new, ${preview.duplicateCount} already in your logbook. Add the ${preview.newEntries.length} new flights?`
    );
    if (!confirmed) {
      return;
    }
    await commitEmiratesImport(db, preview.newEntries);
    await reload();
    await triggerBackup();
  }
```

Replace the temporary no-op prop from Task 2:

```tsx
              onEmiratesImportFile={() => {}}
```

with:

```tsx
              onEmiratesImportFile={handleEmiratesImportFile}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire Emirates report import into App"
```

---

### Task 10: Manual verification with the real file, rebuild, redeploy

**Files:** none (verification + deployment only)

- [ ] **Step 1: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: no errors.

- [ ] **Step 2: Preview and import the real file**

Run: `npm run preview`, open the printed URL in Chrome or Edge.

1. Go to the Backup view.
2. Click **Import Emirates report**, pick Gamal's real `CrewLogReports(1).xlsx`
   (`C:\Users\Gamal\Downloads\CrewLogReports(1).xlsx`).
3. Confirm the summary dialog shows "1,425 flights found in file, 1,425 new, 0 already in your
   logbook" (or close to 1,425 — the exact count depends on whether Gamal has since re-exported
   a slightly different file).
4. Confirm the import, then check the Logbook view: entries should span 2011–2026, stat cards
   should show large non-zero totals, and a handful of specific known flights (e.g. the
   26-MAY-2011 DXB→BAH flight from the spec) should show the right route/aircraft/role.
5. Spot-check 3–5 flights against night-time plausibility: a flight departing in the local
   evening/night at its departure airport should show non-zero night time; a midday flight
   should show zero.

- [ ] **Step 3: Verify re-running the import is a no-op**

Click **Import Emirates report** again and pick the same file. Confirm the summary now shows
"0 new, 1,425 already in your logbook" (or triggers the "No new flights found" alert) and no
duplicate rows appear in the Logbook view.

- [ ] **Step 4: Verify Export still works**

Click **Export**, confirm a `logbook-export-<date>.csv` file downloads and opening it shows the
same flights.

- [ ] **Step 5: Stop the preview server**

Press Ctrl+C in the terminal running `npm run preview`.

- [ ] **Step 6: Redeploy to the live site**

```bash
rm -rf dist/.git
cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy pilot logbook"
git remote add origin https://github.com/gamalaon-svg/pilot-logbook.git
git push -f origin gh-pages
cd ..
rm -rf dist/.git
```

Then open `https://gamalaon-svg.github.io/pilot-logbook/`, hard-refresh
(Ctrl+Shift+R) if it still looks like the old version, and repeat steps 2–4
against the live site.
