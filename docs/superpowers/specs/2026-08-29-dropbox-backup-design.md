# Dropbox CSV Backup — Design Spec

Date: 2026-08-29
Status: Approved for planning

## Purpose

Give Gamal a safety-net backup of his logbook data in his own Dropbox, without
building the full OAuth-based Dropbox API sync originally sketched in the
top-level app spec. This replaces that plan for now: it's simpler, requires no
Dropbox developer app registration, and matches what he actually asked for —
"just a backup CSV file on Dropbox with the latest logbook info."

## Context

- This is a one-way, single-device safety net, not cross-device sync. Per
  [2026-08-28-pilot-logbook-app-design.md](2026-08-28-pilot-logbook-app-design.md),
  Gamal uses one device at a time; this phase doesn't change that — it just
  protects against data loss on whichever device it's connected on (expected
  to be the Windows PC).
- Automatic Dropbox sync of files added to a local Dropbox folder is handled
  entirely by the Dropbox desktop client — this app only needs to write a
  plain file into a folder the user points it at. No Dropbox API calls, no
  OAuth, no App Key.
- Restore is included in this phase (scope was expanded from the initial
  "backup only" proposal during design review) but only for round-tripping
  this app's own backup file format. Importing an arbitrary Safelog export
  (different columns, needs a mapping UI) remains separate future work.

## Architecture

**Backup (write path):** Uses the File System Access API
(`window.showDirectoryPicker`), supported in Chrome/Edge on Windows only —
not Safari, not iOS/iPadOS. Gamal grants write access to a folder once (he
navigates to somewhere inside his local Dropbox folder); the app remembers
that folder and silently overwrites `logbook-backup.csv` inside it after
every add/edit/delete. Dropbox's desktop client then syncs that file change
to the cloud like any other file — this app is unaware Dropbox exists.

**Restore (read path):** Uses a plain `<input type="file" accept=".csv">`,
supported everywhere (Windows, iPad, iPhone, any browser) since it only reads
a user-picked file and needs no persistent folder permission. This is
intentionally decoupled from the write path's browser/platform restriction.

## Backup write flow

1. Settings UI shows either "Not connected" with a **Connect backup folder**
   button, or "Backing up to: `<folder name>`" with last-backup status.
2. Clicking **Connect backup folder** calls `showDirectoryPicker({ mode:
   "readwrite" })`. The returned `FileSystemDirectoryHandle` is stored in a
   new `settings` table in the existing Dexie database (handles are
   structured-cloneable and IndexedDB-storable in supporting browsers).
3. After every successful add/edit/delete in `App.tsx`'s existing reload
   flow, trigger `writeBackup()`:
   - Confirm `directoryHandle.queryPermission({ mode: "readwrite" })` is
     `"granted"`. If not, **do not** call `requestPermission()` automatically
     — that requires an active user gesture and will fail silently outside
     one. Instead, mark backup status as "Reconnect needed" and stop.
   - Get/create `logbook-backup.csv` via `getFileHandle(..., { create:
     true })`, open a writable stream, write the full CSV (see format below)
     regenerated from all current entries, close the stream.
   - On success, record a timestamp in `settings`. On any thrown error,
     record an error message in `settings` (e.g. folder was deleted/moved).
4. The status UI reflects `settings` on every render: last backup time, or a
   warning with a **Reconnect folder** button (re-invokes step 2, which is a
   direct user gesture so `requestPermission` / a fresh picker works).
5. Feature-detect `showDirectoryPicker` on load; if absent (Safari, iOS),
   show "Backup requires Chrome or Edge on Windows" instead of the connect
   button, without erroring.

## CSV format

One row per `FlightEntry`, header row first, in this exact column order
(mirrors the `FlightEntry` type minus the internal `id`, which is
regenerated on restore rather than preserved):

```
date,departure,arrival,aircraftType,aircraftRegistration,blockOffTime,blockOnTime,totalTimeMinutes,role,dayTimeMinutes,nightTimeMinutes,ifrTimeMinutes,vfrTimeMinutes,crossCountryTimeMinutes,landingsDay,landingsNight,approaches,remarks
```

Standard RFC 4180 quoting: any field containing a comma, double quote, or
newline is wrapped in double quotes, with internal double quotes doubled
(`"` → `""`). This matters because `remarks`/`approaches` are free text.

## Restore flow

1. A **Restore from backup** button (always visible, regardless of browser/
   platform support for the write path) opens a native file picker scoped to
   `.csv`.
2. The selected file's text is parsed using the exact inverse of the writer's
   quoting rules, validated against the expected header row (if the header
   doesn't match, show an error and abort rather than guessing a mapping —
   this restore path is not a general-purpose importer).
3. Show a confirmation dialog: "This will replace your current `<N>` flight
   entries with `<M>` entries from this backup. This can't be undone.
   Continue?"
4. On confirm: clear the `flightEntries` table and bulk-insert the parsed
   rows (each gets a fresh auto-generated `id`; the CSV's rows carry no id).
   Reload the UI from the database as usual.
5. On cancel, or on a parse error, no data is touched.

## Data model addition

New Dexie table, version-bumped on the existing `LogbookDatabase`:

```
settings: "key"
```

A simple key/value table. Keys used in this phase: `backupDirectoryHandle`,
`lastBackupAt`, `lastBackupError`. Chosen as a generic key/value store (not a
single-row object) so later phases (home airport, default report format,
Dropbox-folder-vs-full-sync toggle, etc. — already anticipated in the
top-level spec's Settings section) can add keys without another schema
migration.

## Out of scope for this phase

- Cross-device sync (explicitly ruled out earlier in this design session —
  this is backup-only).
- Restoring/importing a Safelog export or any CSV with a different column
  layout.
- iPad/iPhone automatic backup (no File System Access API support there);
  restore works there, backup-writing does not.
- Dated/rolling backup snapshots (single overwritten file only, per
  decision).
