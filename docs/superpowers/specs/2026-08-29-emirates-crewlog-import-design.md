# Emirates CrewLog Import — Design Spec

Date: 2026-08-29
Status: Approved for planning

## Purpose

Gamal's actual way of maintaining this logbook going forward is periodically
exporting a "Flight Time Report" (`CrewLogReports.xlsx`) from the Emirates
crew portal and importing it — not manually typing in every flight. This
phase makes that possible: import his full career history (1,425 flights,
2011–2026, verified against a real export he provided) and support
re-running the same kind of import indefinitely as new flights accumulate.

This supersedes the originally-planned generic "Safelog CSV import" for now
— Emirates' own portal export is the actual, authoritative, recurring data
source Gamal uses, whereas Safelog import would need a sample file that
doesn't exist yet. Print/PDF report export (discussed earlier in this
session) is paused, unstarted, and picked up again after this phase.

## Context — what's actually in the Emirates export

Verified directly against Gamal's real file:

- One sheet, a 15-row report header (pilot name/ID, date range, running
  totals, record count), then a data table with columns: `Flight Date`,
  `A/C Type`, `Flt No`, `A/C Reg`, `From`, `To`, `ATD`, `ATA`, `Block`,
  `Stick`, `Take off`, `Landing`, `SDC`, `Crew Name`, `DE Time`.
- 1,425 rows, no missing dates/routes/block times. Aircraft type codes seen:
  `A33` (A330), `380`/`388` (A380).
- `ATD`/`ATA` are in a single consistent time reference (confirmed: block
  duration always equals raw clock difference between them regardless of
  departure/arrival timezone, which is only possible if both are recorded
  in the same reference — i.e. UTC/Zulu, standard for airline ops records).
- `Crew Name` lists every pilot on the flight as `NameCode(licenseNo-rank)`,
  comma-separated, e.g. `AmmarAlhammadi(406091-CA),GamalOun(406191-CA)`.
  Gamal's own rank suffix (`CA`/`FO`) on each row gives his role for that
  flight, and it changes over his career (FO → Captain) — must be parsed
  per row, not assumed constant.
- `Landing` is a per-leg `Y`/blank flag (whether Gamal made that landing),
  not a count.
- `SDC` codes were cross-checked against Gamal's own Emirates "Special Duty
  Codes" reference file — confirmed these are rostering/training/admin
  codes only (e.g. `N` = "notified of roster change," not night flying).
  **Not used for anything in the mapping.**
- Fields the app tracks that this export has no equivalent for: night time,
  IFR/VFR split, approaches, cross-country (as a distinct concept from
  block time).
- All 91 unique airport codes in Gamal's real history were verified present
  in a public airport-coordinates dataset (see Architecture) — the
  night-time calculation approach is confirmed workable end-to-end, not
  theoretical.

## Data model change

Add `flightNumber?: string` to `FlightEntry` (optional — private/GA flights
often don't have one). Threaded through: the type, the CSV backup format,
the entry form (a new optional field), and the flight list table.

## Architecture

**New in-app feature, not a one-time script** — Gamal will run this
repeatedly as new flights accumulate, so all logic (file parsing, mapping,
night-time math, duplicate detection) lives in the app itself.

**New dependencies:** `xlsx` (SheetJS — reads the `.xlsx` file client-side)
and `suncalc` (sunrise/sunset/twilight calculation). Both small,
well-established, widely-used libraries.

**Airport coordinates:** bundled as a trimmed static JSON asset
(`src/import/airports.json`), built once from OurAirports' public,
CC0-licensed dataset, filtered to large/medium airports with an IATA code
(~4,570 entries, ~120KB). Verified this covers all 91 airports in Gamal's
actual history, and — being a comprehensive public dataset rather than a
hand-curated list of just his current airports — will cover future
destinations too without needing updates.

**Import flow:**
1. "Import Emirates report" button (Backup view, next to the existing
   backup/export controls) opens a file picker scoped to `.xlsx`.
2. The file is parsed: locate the header row (`Flight Date` in column A),
   read every row after it into a raw intermediate shape.
3. Each row is mapped to a `FlightEntry`:
   - `date` ← `Flight Date`; `departure`/`arrival` ← `From`/`To`;
     `blockOffTime`/`blockOnTime` ← `ATD`/`ATA`; `flightNumber` ← `Flt No`;
     `aircraftRegistration` ← `A/C Reg`.
   - `aircraftType` ← mapped (`A33`→`A330`, `380`/`388`→`A380`).
   - `totalTimeMinutes` ← parsed directly from `Block` (authoritative,
     already correct — not re-derived from ATD/ATA).
   - `role` ← parsed from `Crew Name`: find the segment matching Gamal's
     name, read its rank suffix, `CA`→`PIC`, `FO`→`SIC`.
   - `ifrTimeMinutes` = `crossCountryTimeMinutes` = `totalTimeMinutes`
     (airline-ops convention: always IFR, always cross-country).
     `vfrTimeMinutes` = 0. `approaches` = `""`.
   - `landingsDay`/`landingsNight` — when `Landing` is `Y`, count one
     landing into whichever bucket matches the day/night status (via the
     same sun-elevation check used below) at the arrival airport's
     coordinates at the exact arrival time (`ATA`); 0/0 when `Landing` is
     blank.
   - `nightTimeMinutes`/`dayTimeMinutes` — computed (see below), always
     summing to `totalTimeMinutes`.
4. **Night-time calculation:** for each flight, look up departure and
   arrival airport coordinates, build a straight-line position path between
   them, and sample it at regular intervals across the UTC block-time
   window (`Flight Date` + `ATD` through arrival, handling midnight
   rollover the same way the existing `computeBlockMinutes` does). At each
   sample point, use `suncalc` to get the sun's elevation at that
   position/time; below the civil-twilight threshold counts as night. Sum
   sampled night minutes.
5. **Duplicate detection:** compute a fingerprint per row (`date` +
   `departure` + `arrival` + `blockOffTime` + `flightNumber`) and compare
   against fingerprints of all existing entries already in the database.
   Rows that match an existing entry are skipped.
6. Show a summary before writing anything: "1,425 flights found in file,
   `N` new, `M` already in your logbook." Only on confirmation are the `N`
   new entries added (plain `bulkAdd`, nothing existing is touched or
   replaced).

**Not built:** editing/undo for a completed import (if something's wrong,
delete the bad entries by hand — matches how the rest of the app already
works, no bulk-undo exists anywhere else either).

## Also in this phase (small, already scoped)

Relabel the existing "Restore from backup" control as "Import," and add a
new "Export" button next to it that downloads the current CSV backup
on-demand (works in any browser, unlike the Chrome/Edge-only folder-connect
backup) — both sit in the Backup view alongside the new Emirates import
button.

## Out of scope for this phase

- Print/PDF report export — separate, already-discussed feature, paused
  and picked up in its own phase after this one.
- Generic Safelog import — no sample file exists; revisit if/when one does.
- Editing the night-time calculation's civil-twilight threshold or
  exposing it as a setting — one fixed, standard definition for now.
- Importing anything from the `SDC`, `Stick`, `Take off`, or `DE Time`
  columns — confirmed not logbook-relevant (or, for `Stick`/`DE Time`,
  redundant with `Block` for Gamal's actual use).
