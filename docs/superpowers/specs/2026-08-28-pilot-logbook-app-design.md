# Pilot Logbook App — Design Spec

Date: 2026-08-28
Status: Approved for planning

## Purpose

Replace Safelog with a self-owned pilot logbook application. Runs on Windows PC,
iPad, and iPhone; data is stored locally on-device and synced/backed up via the
user's own Dropbox account. No subscription, no third-party service holding the
data.

## Context

- User is a non-technical owner: "you are my coder." All implementation,
  builds, and maintenance are done by the assistant; the user tests and gives
  feedback via the running app, not by reading source.
- User has existing flight history in Safelog that must be importable (via
  Safelog's CSV/Excel export).
- Devices are used one at a time — the user logs a flight on whichever device
  is at hand, then moves on. Concurrent edits to the same entry across devices
  before a sync are not expected.
- User holds licenses/ratings under multiple regulatory formats and wants the
  logbook to support both EASA-style and FAA-style presentation.

## Architecture

**Progressive Web App (PWA)** — a single HTML/CSS/JavaScript codebase, no
backend server, hosted at one stable URL (free static host, e.g. GitHub Pages
or Vercel). Installed to the home screen on iPad/iPhone via Safari's "Add to
Home Screen," and used in-browser (or installed as a desktop PWA) on Windows.
Works offline via a service worker.

Rejected alternatives:
- **Native apps per platform** (Swift for iOS, .NET/WPF for Windows): requires
  Xcode, a Mac, an Apple Developer account, app store review, and maintaining
  two+ separate codebases. Explicitly ruled out — user confirmed a web app is
  acceptable and preferred, given they are not doing any of the coding
  themselves.
- **Cross-platform native framework** (Flutter/React Native): single codebase
  but still requires native build/signing pipelines per platform. Unnecessary
  complexity given the PWA path satisfies all stated requirements.

Important: only the *application code* is hosted publicly at the static host.
No flight data, images, or personal documents are ever sent to or stored on
that host — user data lives only in the browser's local storage on each
device and in the user's own Dropbox account.

## Storage & sync

- **Local storage**: IndexedDB, on-device, as the working data store on each
  installed instance of the app.
- **Local backup file (Windows)**: an explicit "save backup" action writes a
  plain, human-readable JSON file to a folder the user picks (e.g.
  Documents), using the File System Access API. This is a real, visible
  backup file independent of browser storage. (Not available on iOS Safari —
  Dropbox sync is the cross-device path there.)
- **Dropbox sync**: the app authenticates directly to the user's Dropbox via
  Dropbox's OAuth2 PKCE flow (no backend secret required, suitable for a
  client-only app). It reads/writes a logbook data file inside an
  app-specific folder in the user's Dropbox.
  - On app open: pull the latest file from Dropbox and merge into local
    storage.
  - On save: push the updated file to Dropbox.
  - Conflict handling: since usage is one-device-at-a-time, use a simple
    version/timestamp check. If the Dropbox copy has a newer version than
    what this device last pulled, warn the user before overwriting rather
    than silently clobbering data.

## Data model

### Flight entry (per leg)
- Date
- Departure / arrival airports (ICAO/IATA)
- Aircraft type & registration
- Times: block off/on, takeoff/landing, total block time, total flight time
- Role/time split: PIC, SIC, dual, relief/augmented crew time
- Day / night time split
- IFR / VFR time split
- Cross-country time (FAA-format field)
- Landings: day, night
- Approaches (type + count)
- Crew composition: names/roles of other crew, augmented crew flag, duty
  start/end, rest
- Remarks (free text)
- Attachments: photos / scanned documents linked to the entry

The field set is a superset covering both EASA and FAA logbook conventions;
no data is format-specific, only the report/export layer is.

### Certificate / rating record
- Type (license, medical, type rating, etc.)
- Number
- Issuing authority
- Issue date, expiry date
- Attachment (scanned document/photo)

### Settings
- Home airport
- Dropbox connection status
- Local backup folder path (Windows)
- Default report format (EASA / FAA)

## Features — v1 scope

**In scope:**
- Flight leg entry, edit, delete
- Crew composition & duty fields
- Certificate/rating tracking with expiry dates
- Photo/document attachments on entries and certificates
- Printable logbook view and PDF export, selectable as EASA-style or
  FAA-style layout at export time
- Summary totals (by aircraft type, role, year)
- Dropbox sync (as described above)
- Local JSON backup/export and restore-from-backup (Windows)
- Safelog import: CSV/Excel upload with a column-mapping step, converting
  Safelog's export into this app's data model

**Explicitly out of scope for v1:**
- Automatic currency/recency calculation and warnings (e.g. 90-day landing
  currency, instrument currency). Not needed now; can be added later without
  changing the underlying data model, since all the raw fields it would need
  are already captured.

## Open items to resolve during implementation planning

- Exact Safelog export format (columns/layout) is unknown until the user
  provides a sample export — the import mapping step should be built to
  handle this via a manual column-mapping UI rather than assuming a fixed
  format.
- Exact EASA-style vs FAA-style printable layouts need reference formats
  (can follow common conventions used by existing paper/PDF logbooks).
