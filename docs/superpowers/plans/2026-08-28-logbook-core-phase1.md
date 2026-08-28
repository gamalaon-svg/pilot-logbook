# Pilot Logbook — Phase 1 (Core Flight Logging) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working, installable PWA where the user can add, edit, delete, and list flight log entries with automatically computed totals (by aircraft type, role, and year), persisted locally in the browser via IndexedDB.

**Architecture:** Single-page React + TypeScript app built with Vite. Data is stored locally with Dexie (an IndexedDB wrapper). No backend, no network calls. This is Phase 1 of a multi-phase build (see `docs/superpowers/specs/2026-08-28-pilot-logbook-app-design.md`) — Dropbox sync, certificates/attachments, extended crew composition, PDF/report export, and Safelog import are deferred to later plans. This phase intentionally covers only the "basic flight legs" slice of the spec (role is captured per-entry as a single PIC/SIC/Dual/Relief value, matching how a paper logbook's time columns work — full multi-person crew composition comes later).

**Tech Stack:** React 18, TypeScript, Vite, Dexie (IndexedDB), Vitest + React Testing Library, vite-plugin-pwa.

---

## File Structure

```
package.json
tsconfig.json
vite.config.ts
vitest.setup.ts
index.html
public/
  icons/icon-192.png
  icons/icon-512.png
src/
  main.tsx
  App.tsx
  App.test.tsx
  types/
    flightEntry.ts
  utils/
    time.ts
    time.test.ts
    totals.ts
    totals.test.ts
  db/
    db.ts
    flightEntries.ts
    flightEntries.test.ts
  components/
    FlightEntryForm.tsx
    FlightEntryForm.test.tsx
    FlightEntryList.tsx
    FlightEntryList.test.tsx
    TotalsSummary.tsx
    TotalsSummary.test.tsx
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/App.tsx` (placeholder, replaced in Task 9)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "pilot-logbook",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "dexie": "^4.0.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^24.1.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.1",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Pilot Logbook",
        short_name: "Logbook",
        description: "Personal pilot flight logbook",
        theme_color: "#0b3d91",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"]
  }
});
```

- [ ] **Step 5: Create `vitest.setup.ts`**

```ts
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>Pilot Logbook</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules
dist
dev-dist
*.local
```

- [ ] **Step 8: Create `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: Create placeholder `src/App.tsx`**

```tsx
export default function App() {
  return <div>Pilot Logbook — under construction</div>;
}
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `node_modules` and `package-lock.json`.

- [ ] **Step 11: Verify dev server boots**

Run: `npm run dev` (then stop it with Ctrl+C once you see the local URL)
Expected: prints a `Local: http://localhost:5173/` URL with no errors.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts vitest.setup.ts index.html .gitignore src/main.tsx src/App.tsx package-lock.json
git commit -m "chore: scaffold Vite + React + TypeScript PWA project"
```

---

### Task 2: FlightEntry type

**Files:**
- Create: `src/types/flightEntry.ts`

- [ ] **Step 1: Create the type definition**

```ts
export type CrewRole = "PIC" | "SIC" | "Dual" | "Relief";

export interface FlightEntry {
  id?: number;
  date: string; // ISO "YYYY-MM-DD"
  departure: string;
  arrival: string;
  aircraftType: string;
  aircraftRegistration: string;
  blockOffTime: string; // "HH:MM" 24-hour
  blockOnTime: string; // "HH:MM" 24-hour
  totalTimeMinutes: number;
  role: CrewRole;
  dayTimeMinutes: number;
  nightTimeMinutes: number;
  ifrTimeMinutes: number;
  vfrTimeMinutes: number;
  crossCountryTimeMinutes: number;
  landingsDay: number;
  landingsNight: number;
  approaches: string;
  remarks: string;
}

export const CREW_ROLES: CrewRole[] = ["PIC", "SIC", "Dual", "Relief"];
```

- [ ] **Step 2: Commit**

```bash
git add src/types/flightEntry.ts
git commit -m "feat: add FlightEntry type"
```

---

### Task 3: Time utilities

**Files:**
- Create: `src/utils/time.ts`
- Test: `src/utils/time.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { parseHHMM, computeBlockMinutes, formatMinutes } from "./time";

describe("parseHHMM", () => {
  it("parses a valid 24-hour time", () => {
    expect(parseHHMM("08:30")).toBe(510);
    expect(parseHHMM("23:59")).toBe(1439);
    expect(parseHHMM("00:00")).toBe(0);
  });

  it("throws on an invalid time", () => {
    expect(() => parseHHMM("25:00")).toThrow(/Invalid time/);
    expect(() => parseHHMM("bad")).toThrow(/Invalid time/);
  });
});

describe("computeBlockMinutes", () => {
  it("computes duration within the same day", () => {
    expect(computeBlockMinutes("08:00", "10:30")).toBe(150);
  });

  it("wraps past midnight", () => {
    expect(computeBlockMinutes("23:00", "01:00")).toBe(120);
  });

  it("returns 0 for identical off/on times", () => {
    expect(computeBlockMinutes("08:00", "08:00")).toBe(0);
  });
});

describe("formatMinutes", () => {
  it("formats minutes as H:MM", () => {
    expect(formatMinutes(150)).toBe("2:30");
    expect(formatMinutes(5)).toBe("0:05");
    expect(formatMinutes(0)).toBe("0:00");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/utils/time.test.ts`
Expected: FAIL — `Cannot find module './time'` (file doesn't exist yet).

- [ ] **Step 3: Implement `src/utils/time.ts`**

```ts
export function parseHHMM(value: string): number {
  const match = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid time "${value}", expected HH:MM in 24-hour format`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function computeBlockMinutes(blockOffTime: string, blockOnTime: string): number {
  const off = parseHHMM(blockOffTime);
  const on = parseHHMM(blockOnTime);
  const diff = on - off;
  return diff >= 0 ? diff : diff + 24 * 60;
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/utils/time.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/time.ts src/utils/time.test.ts
git commit -m "feat: add time parsing/formatting utilities"
```

---

### Task 4: Dexie database schema

**Files:**
- Create: `src/db/db.ts`

- [ ] **Step 1: Implement the database class**

```ts
import Dexie, { Table } from "dexie";
import type { FlightEntry } from "../types/flightEntry";

export class LogbookDatabase extends Dexie {
  flightEntries!: Table<FlightEntry, number>;

  constructor(name = "LogbookDatabase") {
    super(name);
    this.version(1).stores({
      flightEntries: "++id, date, aircraftType, role"
    });
  }
}

export const db = new LogbookDatabase();
```

There is no separate test for this file — it's exercised by the CRUD tests in Task 5, which construct their own isolated `LogbookDatabase` instances.

- [ ] **Step 2: Commit**

```bash
git add src/db/db.ts
git commit -m "feat: add Dexie database schema"
```

---

### Task 5: Flight entry CRUD functions

**Files:**
- Create: `src/db/flightEntries.ts`
- Test: `src/db/flightEntries.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { LogbookDatabase } from "./db";
import {
  addFlightEntry,
  deleteFlightEntry,
  getAllFlightEntries,
  updateFlightEntry
} from "./flightEntries";
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
  remarks: "Test flight"
};

describe("flight entry CRUD", () => {
  let db: LogbookDatabase;

  beforeEach(async () => {
    db = new LogbookDatabase(`test-db-${Math.random()}`);
    await db.open();
  });

  it("adds and retrieves a flight entry", async () => {
    await addFlightEntry(db, sampleEntry);
    const entries = await getAllFlightEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ departure: "OMDB", arrival: "EGLL" });
  });

  it("returns entries ordered by date", async () => {
    await addFlightEntry(db, { ...sampleEntry, date: "2026-08-22" });
    await addFlightEntry(db, { ...sampleEntry, date: "2026-08-19" });
    const entries = await getAllFlightEntries(db);
    expect(entries.map((e) => e.date)).toEqual(["2026-08-19", "2026-08-22"]);
  });

  it("updates a flight entry", async () => {
    const id = await addFlightEntry(db, sampleEntry);
    await updateFlightEntry(db, id, { remarks: "Updated remarks" });
    const entries = await getAllFlightEntries(db);
    expect(entries[0].remarks).toBe("Updated remarks");
  });

  it("deletes a flight entry", async () => {
    const id = await addFlightEntry(db, sampleEntry);
    await deleteFlightEntry(db, id);
    const entries = await getAllFlightEntries(db);
    expect(entries).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/db/flightEntries.test.ts`
Expected: FAIL — `Cannot find module './flightEntries'`.

- [ ] **Step 3: Implement `src/db/flightEntries.ts`**

```ts
import type { LogbookDatabase } from "./db";
import type { FlightEntry } from "../types/flightEntry";

export async function addFlightEntry(db: LogbookDatabase, entry: FlightEntry): Promise<number> {
  return db.flightEntries.add(entry);
}

export async function getAllFlightEntries(db: LogbookDatabase): Promise<FlightEntry[]> {
  return db.flightEntries.orderBy("date").toArray();
}

export async function updateFlightEntry(
  db: LogbookDatabase,
  id: number,
  changes: Partial<FlightEntry>
): Promise<void> {
  await db.flightEntries.update(id, changes);
}

export async function deleteFlightEntry(db: LogbookDatabase, id: number): Promise<void> {
  await db.flightEntries.delete(id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/db/flightEntries.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/db/flightEntries.ts src/db/flightEntries.test.ts
git commit -m "feat: add flight entry CRUD functions"
```

---

### Task 6: Totals utilities

**Files:**
- Create: `src/utils/totals.ts`
- Test: `src/utils/totals.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { totalMinutesByAircraftType, totalMinutesByRole, totalMinutesByYear } from "./totals";
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

describe("totals", () => {
  const entries = [
    makeEntry({ aircraftType: "B777", role: "PIC", date: "2025-06-01", totalTimeMinutes: 60 }),
    makeEntry({ aircraftType: "B777", role: "SIC", date: "2026-01-01", totalTimeMinutes: 90 }),
    makeEntry({ aircraftType: "A380", role: "PIC", date: "2026-02-01", totalTimeMinutes: 120 })
  ];

  it("totals minutes by aircraft type", () => {
    expect(totalMinutesByAircraftType(entries)).toEqual({ B777: 150, A380: 120 });
  });

  it("totals minutes by role", () => {
    expect(totalMinutesByRole(entries)).toEqual({ PIC: 180, SIC: 90 });
  });

  it("totals minutes by year", () => {
    expect(totalMinutesByYear(entries)).toEqual({ "2025": 60, "2026": 210 });
  });

  it("returns an empty object for no entries", () => {
    expect(totalMinutesByAircraftType([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/utils/totals.test.ts`
Expected: FAIL — `Cannot find module './totals'`.

- [ ] **Step 3: Implement `src/utils/totals.ts`**

```ts
import type { FlightEntry } from "../types/flightEntry";

function sumByKey(entries: FlightEntry[], keyFn: (entry: FlightEntry) => string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of entries) {
    const key = keyFn(entry);
    totals[key] = (totals[key] ?? 0) + entry.totalTimeMinutes;
  }
  return totals;
}

export function totalMinutesByAircraftType(entries: FlightEntry[]): Record<string, number> {
  return sumByKey(entries, (entry) => entry.aircraftType);
}

export function totalMinutesByRole(entries: FlightEntry[]): Record<string, number> {
  return sumByKey(entries, (entry) => entry.role);
}

export function totalMinutesByYear(entries: FlightEntry[]): Record<string, number> {
  return sumByKey(entries, (entry) => entry.date.slice(0, 4));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/utils/totals.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/totals.ts src/utils/totals.test.ts
git commit -m "feat: add totals aggregation utilities"
```

---

### Task 7: FlightEntryForm component

**Files:**
- Create: `src/components/FlightEntryForm.tsx`
- Test: `src/components/FlightEntryForm.test.tsx`

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/FlightEntryForm.test.tsx`
Expected: FAIL — `Cannot find module './FlightEntryForm'`.

- [ ] **Step 3: Implement `src/components/FlightEntryForm.tsx`**

```tsx
import { FormEvent, useState } from "react";
import { CREW_ROLES, CrewRole, FlightEntry } from "../types/flightEntry";
import { computeBlockMinutes } from "../utils/time";

interface FlightEntryFormProps {
  initialValue?: FlightEntry;
  onSubmit: (entry: FlightEntry) => void;
}

type FormState = Omit<
  FlightEntry,
  "totalTimeMinutes" | "dayTimeMinutes" | "nightTimeMinutes" | "ifrTimeMinutes" | "vfrTimeMinutes" | "crossCountryTimeMinutes" | "landingsDay" | "landingsNight"
> & {
  dayTimeMinutes: string;
  nightTimeMinutes: string;
  ifrTimeMinutes: string;
  vfrTimeMinutes: string;
  crossCountryTimeMinutes: string;
  landingsDay: string;
  landingsNight: string;
};

function emptyState(initial?: FlightEntry): FormState {
  return {
    id: initial?.id,
    date: initial?.date ?? "",
    departure: initial?.departure ?? "",
    arrival: initial?.arrival ?? "",
    aircraftType: initial?.aircraftType ?? "",
    aircraftRegistration: initial?.aircraftRegistration ?? "",
    blockOffTime: initial?.blockOffTime ?? "",
    blockOnTime: initial?.blockOnTime ?? "",
    role: initial?.role ?? "PIC",
    dayTimeMinutes: initial ? String(initial.dayTimeMinutes) : "",
    nightTimeMinutes: initial ? String(initial.nightTimeMinutes) : "",
    ifrTimeMinutes: initial ? String(initial.ifrTimeMinutes) : "",
    vfrTimeMinutes: initial ? String(initial.vfrTimeMinutes) : "",
    crossCountryTimeMinutes: initial ? String(initial.crossCountryTimeMinutes) : "",
    landingsDay: initial ? String(initial.landingsDay) : "",
    landingsNight: initial ? String(initial.landingsNight) : "",
    approaches: initial?.approaches ?? "",
    remarks: initial?.remarks ?? ""
  };
}

export function FlightEntryForm({ initialValue, onSubmit }: FlightEntryFormProps) {
  const [form, setForm] = useState<FormState>(() => emptyState(initialValue));
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const totalTimeMinutes = computeBlockMinutes(form.blockOffTime, form.blockOnTime);
      const entry: FlightEntry = {
        id: form.id,
        date: form.date,
        departure: form.departure,
        arrival: form.arrival,
        aircraftType: form.aircraftType,
        aircraftRegistration: form.aircraftRegistration,
        blockOffTime: form.blockOffTime,
        blockOnTime: form.blockOnTime,
        totalTimeMinutes,
        role: form.role as CrewRole,
        dayTimeMinutes: Number(form.dayTimeMinutes) || 0,
        nightTimeMinutes: Number(form.nightTimeMinutes) || 0,
        ifrTimeMinutes: Number(form.ifrTimeMinutes) || 0,
        vfrTimeMinutes: Number(form.vfrTimeMinutes) || 0,
        crossCountryTimeMinutes: Number(form.crossCountryTimeMinutes) || 0,
        landingsDay: Number(form.landingsDay) || 0,
        landingsNight: Number(form.landingsNight) || 0,
        approaches: form.approaches,
        remarks: form.remarks
      };
      onSubmit(entry);
      setForm(emptyState());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="date">Date</label>
      <input id="date" type="text" value={form.date} onChange={handleChange("date")} />

      <label htmlFor="departure">Departure</label>
      <input id="departure" type="text" value={form.departure} onChange={handleChange("departure")} />

      <label htmlFor="arrival">Arrival</label>
      <input id="arrival" type="text" value={form.arrival} onChange={handleChange("arrival")} />

      <label htmlFor="aircraftType">Aircraft type</label>
      <input id="aircraftType" type="text" value={form.aircraftType} onChange={handleChange("aircraftType")} />

      <label htmlFor="aircraftRegistration">Registration</label>
      <input
        id="aircraftRegistration"
        type="text"
        value={form.aircraftRegistration}
        onChange={handleChange("aircraftRegistration")}
      />

      <label htmlFor="blockOffTime">Block off</label>
      <input id="blockOffTime" type="text" value={form.blockOffTime} onChange={handleChange("blockOffTime")} />

      <label htmlFor="blockOnTime">Block on</label>
      <input id="blockOnTime" type="text" value={form.blockOnTime} onChange={handleChange("blockOnTime")} />

      <label htmlFor="role">Role</label>
      <select id="role" value={form.role} onChange={handleChange("role")}>
        {CREW_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <label htmlFor="dayTimeMinutes">Day time (minutes)</label>
      <input id="dayTimeMinutes" type="text" value={form.dayTimeMinutes} onChange={handleChange("dayTimeMinutes")} />

      <label htmlFor="nightTimeMinutes">Night time (minutes)</label>
      <input
        id="nightTimeMinutes"
        type="text"
        value={form.nightTimeMinutes}
        onChange={handleChange("nightTimeMinutes")}
      />

      <label htmlFor="ifrTimeMinutes">IFR time (minutes)</label>
      <input id="ifrTimeMinutes" type="text" value={form.ifrTimeMinutes} onChange={handleChange("ifrTimeMinutes")} />

      <label htmlFor="vfrTimeMinutes">VFR time (minutes)</label>
      <input id="vfrTimeMinutes" type="text" value={form.vfrTimeMinutes} onChange={handleChange("vfrTimeMinutes")} />

      <label htmlFor="crossCountryTimeMinutes">Cross-country time (minutes)</label>
      <input
        id="crossCountryTimeMinutes"
        type="text"
        value={form.crossCountryTimeMinutes}
        onChange={handleChange("crossCountryTimeMinutes")}
      />

      <label htmlFor="landingsDay">Day landings</label>
      <input id="landingsDay" type="text" value={form.landingsDay} onChange={handleChange("landingsDay")} />

      <label htmlFor="landingsNight">Night landings</label>
      <input id="landingsNight" type="text" value={form.landingsNight} onChange={handleChange("landingsNight")} />

      <label htmlFor="approaches">Approaches</label>
      <input id="approaches" type="text" value={form.approaches} onChange={handleChange("approaches")} />

      <label htmlFor="remarks">Remarks</label>
      <input id="remarks" type="text" value={form.remarks} onChange={handleChange("remarks")} />

      {error && <p role="alert">{error}</p>}

      <button type="submit">Save</button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/FlightEntryForm.test.tsx`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/FlightEntryForm.tsx src/components/FlightEntryForm.test.tsx
git commit -m "feat: add FlightEntryForm component"
```

---

### Task 8: FlightEntryList component

**Files:**
- Create: `src/components/FlightEntryList.tsx`
- Test: `src/components/FlightEntryList.test.tsx`

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/FlightEntryList.test.tsx`
Expected: FAIL — `Cannot find module './FlightEntryList'`.

- [ ] **Step 3: Implement `src/components/FlightEntryList.tsx`**

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
    <table>
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
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/FlightEntryList.test.tsx`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/FlightEntryList.tsx src/components/FlightEntryList.test.tsx
git commit -m "feat: add FlightEntryList component"
```

---

### Task 9: TotalsSummary component

**Files:**
- Create: `src/components/TotalsSummary.tsx`
- Test: `src/components/TotalsSummary.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TotalsSummary } from "./TotalsSummary";
import type { FlightEntry } from "../types/flightEntry";

const entries: FlightEntry[] = [
  {
    id: 1,
    date: "2026-08-20",
    departure: "OMDB",
    arrival: "EGLL",
    aircraftType: "B777",
    aircraftRegistration: "A6-EXAMPLE",
    blockOffTime: "08:00",
    blockOnTime: "10:30",
    totalTimeMinutes: 150,
    role: "PIC",
    dayTimeMinutes: 150,
    nightTimeMinutes: 0,
    ifrTimeMinutes: 150,
    vfrTimeMinutes: 0,
    crossCountryTimeMinutes: 150,
    landingsDay: 1,
    landingsNight: 0,
    approaches: "",
    remarks: ""
  }
];

describe("TotalsSummary", () => {
  it("shows totals by aircraft type, role, and year", () => {
    render(<TotalsSummary entries={entries} />);
    expect(screen.getByText("B777")).toBeInTheDocument();
    expect(screen.getByText("PIC")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getAllByText("2:30").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/TotalsSummary.test.tsx`
Expected: FAIL — `Cannot find module './TotalsSummary'`.

- [ ] **Step 3: Implement `src/components/TotalsSummary.tsx`**

```tsx
import { FlightEntry } from "../types/flightEntry";
import { totalMinutesByAircraftType, totalMinutesByRole, totalMinutesByYear } from "../utils/totals";
import { formatMinutes } from "../utils/time";

interface TotalsSummaryProps {
  entries: FlightEntry[];
}

function TotalsTable({ title, totals }: { title: string; totals: Record<string, number> }) {
  return (
    <div>
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
    <section>
      <TotalsTable title="By aircraft type" totals={totalMinutesByAircraftType(entries)} />
      <TotalsTable title="By role" totals={totalMinutesByRole(entries)} />
      <TotalsTable title="By year" totals={totalMinutesByYear(entries)} />
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/TotalsSummary.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TotalsSummary.tsx src/components/TotalsSummary.test.tsx
git commit -m "feat: add TotalsSummary component"
```

---

### Task 10: Wire up App

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  it("adds a flight entry and shows it in the list and totals", async () => {
    const user = userEvent.setup();
    render(<App />);

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
    expect(screen.getByText("By aircraft type")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — placeholder `App` has no form/list.

- [ ] **Step 3: Implement `src/App.tsx`**

```tsx
import { useEffect, useState } from "react";
import { db } from "./db/db";
import { addFlightEntry, deleteFlightEntry, getAllFlightEntries, updateFlightEntry } from "./db/flightEntries";
import { FlightEntryForm } from "./components/FlightEntryForm";
import { FlightEntryList } from "./components/FlightEntryList";
import { TotalsSummary } from "./components/TotalsSummary";
import type { FlightEntry } from "./types/flightEntry";

export default function App() {
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FlightEntry | undefined>(undefined);

  async function reload() {
    setEntries(await getAllFlightEntries(db));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSubmit(entry: FlightEntry) {
    if (editingEntry?.id !== undefined) {
      await updateFlightEntry(db, editingEntry.id, entry);
      setEditingEntry(undefined);
    } else {
      await addFlightEntry(db, entry);
    }
    await reload();
  }

  async function handleDelete(id: number) {
    await deleteFlightEntry(db, id);
    await reload();
  }

  return (
    <main>
      <h1>Pilot Logbook</h1>
      <FlightEntryForm key={editingEntry?.id ?? "new"} initialValue={editingEntry} onSubmit={handleSubmit} />
      <FlightEntryList entries={entries} onEdit={setEditingEntry} onDelete={handleDelete} />
      <TotalsSummary entries={entries} />
    </main>
  );
}
```

Note: `flightEntries.ts` CRUD functions take a `db` parameter (see Task 5), so `App.tsx` passes the shared `db` instance from `src/db/db.ts` explicitly on every call.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests across every file green.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire up App with form, list, and totals"
```

---

### Task 11: PWA icons and manual install check

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

- [ ] **Step 1: Generate placeholder icons**

Write a minimal valid 1x1 PNG to both required icon paths. This makes the build and PWA manifest resolve correctly now; the actual artwork (sized properly to 192x192 and 512x512) can be swapped in later without touching any code.

```bash
node -e "
const { writeFileSync } = require('fs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
writeFileSync('public/icons/icon-192.png', png);
writeFileSync('public/icons/icon-512.png', png);
"
```

- [ ] **Step 2: Build the app**

Run: `npm run build`
Expected: completes with no errors, produces a `dist/` folder including `manifest.webmanifest` and a service worker.

- [ ] **Step 3: Manually verify the app works end to end**

Run: `npm run preview` (prints a local URL, e.g. `http://localhost:4173`)

Open that URL in a browser and:
1. Add a flight entry using the form.
2. Confirm it appears in the table below with the correct computed total time.
3. Confirm the totals section updates.
4. Refresh the page — confirm the entry is still there (proves IndexedDB persistence).
5. Click Edit on the entry, change a field, save — confirm it updates in place rather than duplicating.
6. Click Delete — confirm it disappears from the list and totals.

Stop the preview server with Ctrl+C when done.

- [ ] **Step 4: Commit**

```bash
git add public/icons/icon-192.png public/icons/icon-512.png
git commit -m "chore: add PWA icons"
```

---

## Self-Review Notes

- **Spec coverage:** This plan implements the "basic flight legs" portion of the spec's v1 scope (flight entry CRUD, computed times, totals) plus the PWA installable shell from the architecture section. Crew composition (multi-person, duty/rest), certificates/ratings, attachments, Dropbox sync, local backup file export, PDF/report export, and Safelog import are explicitly deferred to later plans, as stated in this plan's Architecture section and the spec's "v1 scope."
- **Type consistency:** `FlightEntry` (Task 2) is used identically across `db/flightEntries.ts`, `utils/totals.ts`, `components/FlightEntryForm.tsx`, `components/FlightEntryList.tsx`, and `components/TotalsSummary.tsx`. `LogbookDatabase` (Task 4) and its `db` parameter threading into the CRUD functions (Task 5) is consistent with how `App.tsx` (Task 10) calls them.
- **No placeholders:** all steps contain complete, runnable code and exact commands.
