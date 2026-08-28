# Logbook Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the currently unstyled app into a real-looking logbook app: a navy sidebar for navigation between Logbook / Totals / Backup, stat cards for headline totals, a styled data-grid table, and an Add Flight button that reveals the entry form instead of it always being visible.

**Architecture:** Pure presentation-layer change — one new global stylesheet, two new small components (`Sidebar`, `StatCards`), minor `className` additions to existing components (no prop/behavior changes), and `App.tsx` restructured around a single `activeView` state value instead of stacking every section on one page. No data layer, backup logic, or CSV logic is touched.

**Tech Stack:** Same as before (React, TypeScript, Vite, Vitest + React Testing Library). Plain hand-written CSS — no component library or CSS framework added.

---

## File Structure

```
src/
  index.css                    (new: global styles/design tokens)
  main.tsx                     (modified: import index.css)
  utils/
    totals.ts                  (modified: 3 new aggregate functions)
    totals.test.ts             (modified: tests for the new functions)
  components/
    Sidebar.tsx                (new)
    Sidebar.test.tsx           (new)
    StatCards.tsx               (new)
    StatCards.test.tsx          (new)
    FlightEntryForm.tsx        (modified: add className="flight-form")
    FlightEntryList.tsx        (modified: add className hooks)
    TotalsSummary.tsx          (modified: add className hooks)
    BackupSettings.tsx         (modified: add className hook, drop internal <h2>)
  App.tsx                      (modified: sidebar + view switching + form visibility)
  App.test.tsx                 (modified: updated for the new navigation flow)
```

---

### Task 1: Global stylesheet

**Files:**
- Create: `src/index.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create the stylesheet**

```css
/* src/index.css */
:root {
  --navy: #0b3d63;
  --navy-dark: #0a2f4d;
  --bg: #f4f6f8;
  --card-bg: #ffffff;
  --border: #e2e7ec;
  --border-light: #eef1f3;
  --text: #1c2530;
  --text-muted: #56636d;
  --accent: #4da3ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 190px;
  flex-shrink: 0;
  background: linear-gradient(180deg, var(--navy), var(--navy-dark));
  color: #dbe7f2;
  padding: 18px 0;
  display: flex;
  flex-direction: column;
}

.sidebar-brand {
  font-weight: 700;
  font-size: 15px;
  padding: 0 18px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 10px;
}

.sidebar-nav-item {
  padding: 9px 18px;
  font-size: 13.5px;
  text-align: left;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  color: #b9cbdb;
  cursor: pointer;
  font-family: inherit;
}

.sidebar-nav-item.active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 600;
  border-left-color: var(--accent);
}

.app-main {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.view-header h1 {
  font-size: 20px;
  margin: 0;
  color: var(--navy);
}

.add-flight-btn,
.cancel-btn,
.flight-form button[type="submit"] {
  background: var(--navy);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.cancel-btn {
  background: #fff;
  color: var(--text-muted);
  border: 1px solid var(--border);
  margin-left: 8px;
}

.stat-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
}

.stat-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 19px;
  font-weight: 700;
  color: var(--navy);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.add-flight-panel {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.flight-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px 14px;
  align-items: end;
}

.flight-form label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  margin-bottom: 3px;
}

.flight-form input,
.flight-form select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 13px;
  font-family: inherit;
}

.flight-form button[type="submit"] {
  grid-column: 1 / -1;
  justify-self: start;
}

.logbook-table-wrap {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.logbook-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.logbook-table thead th {
  background: #eef2f5;
  color: var(--text-muted);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.4px;
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}

.logbook-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-light);
  font-variant-numeric: tabular-nums;
}

.logbook-table tbody tr:nth-child(even) {
  background: #fafbfc;
}

.logbook-table tbody tr:hover {
  background: #eef6ff;
}

.logbook-table button {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  margin-right: 4px;
  cursor: pointer;
  font-family: inherit;
}

.totals-summary {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.totals-block {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  min-width: 200px;
}

.totals-block h3 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--navy);
}

.totals-block ul {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}

.totals-block li {
  padding: 3px 0;
  border-bottom: 1px solid var(--border-light);
}

.backup-settings {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  max-width: 480px;
}

@media (max-width: 700px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    flex-direction: row;
    padding: 8px;
    gap: 4px;
  }

  .sidebar-brand {
    display: none;
  }

  .sidebar-nav-item {
    border-left: none;
    border-bottom: 3px solid transparent;
    flex: 1;
    text-align: center;
  }

  .sidebar-nav-item.active {
    border-left-color: transparent;
    border-bottom-color: var(--accent);
  }

  .stat-cards {
    flex-wrap: wrap;
  }

  .stat-card {
    min-width: 45%;
  }
}
```

- [ ] **Step 2: Import it in main.tsx**

Replace the full contents of `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS — all existing tests still green (CSS alone changes nothing behavioral).

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/main.tsx
git commit -m "feat: add global stylesheet"
```

---

### Task 2: New totals aggregate functions

**Files:**
- Modify: `src/utils/totals.ts`
- Modify: `src/utils/totals.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these three `it()` blocks inside the existing `describe("totals", ...)` block in
`src/utils/totals.test.ts` (after the existing four tests, before the closing `});`):

```ts
  it("sums total minutes across all entries", () => {
    expect(sumTotalMinutes(entries)).toBe(270);
  });

  it("sums total landings across all entries", () => {
    expect(sumTotalLandings(entries)).toBe(3);
  });

  it("sums minutes for a specific year", () => {
    expect(sumMinutesForYear(entries, 2026)).toBe(210);
    expect(sumMinutesForYear(entries, 2025)).toBe(60);
  });
```

Update the import line at the top of the file to include the three new names:

```ts
import { totalMinutesByAircraftType, totalMinutesByRole, totalMinutesByYear, sumTotalMinutes, sumTotalLandings, sumMinutesForYear } from "./totals";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/utils/totals.test.ts`
Expected: FAIL — `sumTotalMinutes` (and the other two) are not exported yet.

- [ ] **Step 3: Add the functions**

Add these to the end of `src/utils/totals.ts`:

```ts
export function sumTotalMinutes(entries: FlightEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.totalTimeMinutes, 0);
}

export function sumTotalLandings(entries: FlightEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.landingsDay + entry.landingsNight, 0);
}

export function sumMinutesForYear(entries: FlightEntry[], year: number): number {
  return sumTotalMinutes(entries.filter((entry) => entry.date.startsWith(String(year))));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/utils/totals.test.ts`
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/totals.ts src/utils/totals.test.ts
git commit -m "feat: add total-minutes/landings/year aggregate helpers"
```

---

### Task 3: Sidebar component

**Files:**
- Create: `src/components/Sidebar.tsx`
- Test: `src/components/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/Sidebar.test.tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/Sidebar.test.tsx`
Expected: FAIL — `Cannot find module './Sidebar'`.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/Sidebar.tsx
export type ViewName = "logbook" | "totals" | "backup";

interface SidebarProps {
  activeView: ViewName;
  onSelectView: (view: ViewName) => void;
}

const NAV_ITEMS: { view: ViewName; label: string }[] = [
  { view: "logbook", label: "Logbook" },
  { view: "totals", label: "Totals" },
  { view: "backup", label: "Backup" }
];

export function Sidebar({ activeView, onSelectView }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">Pilot Logbook</div>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.view}
          type="button"
          className={`sidebar-nav-item${activeView === item.view ? " active" : ""}`}
          onClick={() => onSelectView(item.view)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/Sidebar.test.tsx`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat: add Sidebar navigation component"
```

---

### Task 4: StatCards component

**Files:**
- Create: `src/components/StatCards.tsx`
- Test: `src/components/StatCards.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/StatCards.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCards } from "./StatCards";
import type { FlightEntry } from "../types/flightEntry";

function makeEntry(overrides: Partial<FlightEntry>): FlightEntry {
  return {
    date: "2026-01-01",
    departure: "OMDB",
    arrival: "EGLL",
    aircraftType: "B777",
    aircraftRegistration: "A6-EXAMPLE",
    blockOffTime: "08:00",
    blockOnTime: "09:00",
    totalTimeMinutes: 60,
    role: "PIC",
    dayTimeMinutes: 60,
    nightTimeMinutes: 0,
    ifrTimeMinutes: 60,
    vfrTimeMinutes: 0,
    crossCountryTimeMinutes: 60,
    landingsDay: 1,
    landingsNight: 0,
    approaches: "",
    remarks: "",
    ...overrides
  };
}

describe("StatCards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows total time, PIC time, this year's time, and landings", () => {
    const entries: FlightEntry[] = [
      makeEntry({ date: "2025-01-01", role: "PIC", totalTimeMinutes: 60, landingsDay: 1, landingsNight: 0 }),
      makeEntry({ date: "2026-02-01", role: "SIC", totalTimeMinutes: 90, landingsDay: 0, landingsNight: 1 }),
      makeEntry({ date: "2026-03-01", role: "PIC", totalTimeMinutes: 120, landingsDay: 1, landingsNight: 1 })
    ];

    render(<StatCards entries={entries} />);

    expect(screen.getByText("4:30")).toBeInTheDocument();
    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(screen.getByText("3:30")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/StatCards.test.tsx`
Expected: FAIL — `Cannot find module './StatCards'`.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/StatCards.tsx
import { FlightEntry } from "../types/flightEntry";
import { sumMinutesForYear, sumTotalLandings, sumTotalMinutes, totalMinutesByRole } from "../utils/totals";
import { formatMinutes } from "../utils/time";

interface StatCardsProps {
  entries: FlightEntry[];
}

export function StatCards({ entries }: StatCardsProps) {
  const currentYear = new Date().getFullYear();
  const picMinutes = totalMinutesByRole(entries).PIC ?? 0;

  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="stat-label">Total time</div>
        <div className="stat-value">{formatMinutes(sumTotalMinutes(entries))}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">PIC</div>
        <div className="stat-value">{formatMinutes(picMinutes)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">This year</div>
        <div className="stat-value">{formatMinutes(sumMinutesForYear(entries, currentYear))}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Landings</div>
        <div className="stat-value">{sumTotalLandings(entries)}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/StatCards.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatCards.tsx src/components/StatCards.test.tsx
git commit -m "feat: add StatCards component"
```

---

### Task 5: Style hooks on existing components

No new behavior in this task — only `className` additions (and one small
markup removal) so the stylesheet from Task 1 has something to attach to.
Existing test files for these components should still pass unchanged since
none of them assert on the absence of classes or the removed heading.

**Files:**
- Modify: `src/components/FlightEntryForm.tsx`
- Modify: `src/components/FlightEntryList.tsx`
- Modify: `src/components/TotalsSummary.tsx`
- Modify: `src/components/BackupSettings.tsx`

- [ ] **Step 1: Add a class to the flight form**

In `src/components/FlightEntryForm.tsx`, change:

```tsx
    <form onSubmit={handleSubmit}>
```

to:

```tsx
    <form onSubmit={handleSubmit} className="flight-form">
```

- [ ] **Step 2: Add classes to the flight list table**

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

- [ ] **Step 3: Add classes to the totals summary**

Replace the full contents of `src/components/TotalsSummary.tsx`:

```tsx
import { FlightEntry } from "../types/flightEntry";
import { totalMinutesByAircraftType, totalMinutesByRole, totalMinutesByYear } from "../utils/totals";
import { formatMinutes } from "../utils/time";

interface TotalsSummaryProps {
  entries: FlightEntry[];
}

function TotalsTable({ title, totals }: { title: string; totals: Record<string, number> }) {
  return (
    <div className="totals-block">
      <h3>{title}</h3>
      <ul>
        {Object.entries(totals).map(([key, minutes]) => (
          <li key={key}>
            {key}: {formatMinutes(minutes)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TotalsSummary({ entries }: TotalsSummaryProps) {
  return (
    <section className="totals-summary">
      <TotalsTable title="By aircraft type" totals={totalMinutesByAircraftType(entries)} />
      <TotalsTable title="By role" totals={totalMinutesByRole(entries)} />
      <TotalsTable title="By year" totals={totalMinutesByYear(entries)} />
    </section>
  );
}
```

- [ ] **Step 4: Add a class to backup settings and drop its own heading**

`App.tsx` (Task 6) will render an `<h1>` per view, including one for the
Backup view, so `BackupSettings`'s own `<h2>Backup</h2>` would be a
duplicate — remove it. Replace the full contents of
`src/components/BackupSettings.tsx`:

```tsx
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
      <label htmlFor="restoreFile">Restore from backup</label>
      <input id="restoreFile" type="file" accept=".csv" onChange={handleFileChange} />
    </section>
  );
}
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — every existing test for these four components (and
everything else) still green, since only classNames and one duplicate
heading changed.

- [ ] **Step 6: Commit**

```bash
git add src/components/FlightEntryForm.tsx src/components/FlightEntryList.tsx src/components/TotalsSummary.tsx src/components/BackupSettings.tsx
git commit -m "feat: add style hooks to existing components"
```

---

### Task 6: Restructure App into sidebar + view switcher

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/App.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — the form is currently always visible (no "Add Flight"
button to click) and there's no sidebar with "Totals"/"Backup" buttons yet.

- [ ] **Step 3: Restructure App.tsx**

Replace the full contents of `src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { db } from "./db/db";
import { addFlightEntry, deleteFlightEntry, getAllFlightEntries, updateFlightEntry } from "./db/flightEntries";
import { FlightEntryForm } from "./components/FlightEntryForm";
import { FlightEntryList } from "./components/FlightEntryList";
import { TotalsSummary } from "./components/TotalsSummary";
import { BackupSettings } from "./components/BackupSettings";
import { Sidebar, type ViewName } from "./components/Sidebar";
import { StatCards } from "./components/StatCards";
import { connectBackupFolder, getBackupStatus, writeBackup, type BackupStatus } from "./backup/backupWriter";
import { readAndParseBackupFile, replaceAllFlightEntries } from "./backup/restore";
import type { FlightEntry } from "./types/flightEntry";

const INITIAL_BACKUP_STATUS: BackupStatus = { supported: false, connected: false };

export default function App() {
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FlightEntry | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>("logbook");
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

  function handleStartAdd() {
    setEditingEntry(undefined);
    setIsFormOpen(true);
  }

  function handleEdit(entry: FlightEntry) {
    setEditingEntry(entry);
    setIsFormOpen(true);
  }

  function handleCancelForm() {
    setEditingEntry(undefined);
    setIsFormOpen(false);
  }

  async function handleSubmit(entry: FlightEntry) {
    if (editingEntry?.id !== undefined) {
      await updateFlightEntry(db, editingEntry.id, entry);
    } else {
      await addFlightEntry(db, entry);
    }
    setEditingEntry(undefined);
    setIsFormOpen(false);
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
    <div className="app-shell">
      <Sidebar activeView={activeView} onSelectView={setActiveView} />
      <main className="app-main">
        {activeView === "logbook" && (
          <section>
            <div className="view-header">
              <h1>Logbook</h1>
              {!isFormOpen && (
                <button type="button" className="add-flight-btn" onClick={handleStartAdd}>
                  + Add Flight
                </button>
              )}
            </div>
            <StatCards entries={entries} />
            {isFormOpen && (
              <div className="add-flight-panel">
                <FlightEntryForm key={editingEntry?.id ?? "new"} initialValue={editingEntry} onSubmit={handleSubmit} />
                <button type="button" className="cancel-btn" onClick={handleCancelForm}>
                  Cancel
                </button>
              </div>
            )}
            <FlightEntryList entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
          </section>
        )}
        {activeView === "totals" && (
          <section>
            <div className="view-header">
              <h1>Totals</h1>
            </div>
            <TotalsSummary entries={entries} />
          </section>
        )}
        {activeView === "backup" && (
          <section>
            <div className="view-header">
              <h1>Backup</h1>
            </div>
            <BackupSettings status={backupStatus} onConnect={handleConnect} onRestoreFile={handleRestoreFile} />
          </section>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/App.test.tsx`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file green.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: restructure App around sidebar navigation and view switching"
```

---

### Task 7: Manual verification, rebuild, and redeploy

**Files:** none (verification + deployment only)

- [ ] **Step 1: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: no errors, `dist/` produced.

- [ ] **Step 2: Preview and check desktop layout**

Run: `npm run preview`, open the printed URL in a browser at a normal
desktop width (~1280px). Confirm:
1. Navy sidebar on the left with Logbook / Totals / Backup.
2. Logbook view shows stat cards, an "Add Flight" button, and (once you add
   a flight) the styled data-grid table.
3. Clicking "Add Flight" reveals the form; clicking "Cancel" hides it again
   without saving; submitting hides it and shows the new entry.
4. Clicking "Totals" and "Backup" switches the view correctly and each
   looks styled (cards/borders, not bare HTML).

- [ ] **Step 3: Check the narrow/mobile layout**

Resize the browser window to under 700px wide (or use browser dev tools'
device toolbar for an iPhone-sized viewport). Confirm the sidebar collapses
to a horizontal tab bar across the top instead of staying a fixed-width
left column, and the stat cards wrap to two per row instead of overflowing.

- [ ] **Step 4: Redeploy to the live site**

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

(the leading `rm -rf dist/.git` makes this safe to re-run — without it, a
second deploy would fail at `git checkout -b gh-pages` if a previous run's
`.git` folder happened to survive the next `npm run build`)

Then open `https://gamalaon-svg.github.io/pilot-logbook/` and re-check
steps 2 and 3 against the live site (GitHub Pages can take a minute or two
to update — refresh if you still see the old version).
