# Logbook Visual Redesign — Design Spec

Date: 2026-08-29
Status: Approved for planning

## Purpose

Phase 1 shipped with placeholder styling (plain unstyled HTML form and table).
Gamal wants something that looks and feels like a real professional pilot
logbook app — he named LogTen Pro as the reference. This phase is visual and
structural polish only: no new data, no new features, no changes to the
Dropbox backup logic.

## Context

- No internet access was available to pull an actual LogTen Pro screenshot
  for pixel-accurate reference. A mockup was built from general knowledge of
  professional logbook/dashboard app conventions (sidebar nav, data-grid
  table, stat cards) and shown to Gamal via the visual brainstorming
  companion.
- Gamal's reaction: "much better... this looks fine" — explicitly not asking
  for pixel-perfect LogTen Pro replication, just a "functional practical
  logbook" that doesn't look like a bare HTML form.
- Underlying data model, CRUD logic, CSV backup/restore logic are all
  unchanged. This is presentation-layer only.

## Approved direction (from the mockup)

- Dark navy sidebar on the left with three nav items: **Logbook**,
  **Totals**, **Backup**.
- Clicking a nav item shows only that section — the app becomes a
  single-page view-switcher, not everything stacked on one long page like
  today.
- **Logbook view**: a row of compact stat cards (Total Time, PIC time, time
  this year, total landings) above an **Add Flight** button, which reveals
  the entry form (instead of the form always being visible inline). Below
  that, flight entries render in a dense, bordered data-grid table with
  alternating row shading — not the current bare `<table>`.
- **Totals view**: the existing by-aircraft-type / by-role / by-year
  breakdowns (currently in `TotalsSummary`), restyled to match, on their own
  screen.
- **Backup view**: the existing `BackupSettings` functionality, restyled to
  match, on its own screen.

## Architecture

**No new libraries.** Plain CSS (no Tailwind/component library — YAGNI for
an app this size, and keeps the dependency footprint that a non-technical
owner has to trust minimal). One new stylesheet, hand-written, following the
color/spacing system established in the mockup (navy sidebar `#0b3d63`,
light neutral background `#f4f6f8`, white cards/table with `#e2e7ec`
borders).

**View switching**: a single piece of state in `App.tsx` (`activeView:
"logbook" | "totals" | "backup"`), no router library — three views, no deep
linking need, no back-button requirement identified.

**Component changes:**
- New `Sidebar` component (nav items, active-state highlighting, calls
  `onSelectView`).
- New `StatCards` component computing the four headline numbers from
  `entries` (reuses existing `totals.ts` functions plus a couple of new
  simple aggregates: overall total, current-year total, total landings).
- `FlightEntryForm` becomes conditionally rendered (only mounted when "Add
  Flight" is clicked, or an entry is being edited), instead of always
  visible.
- `FlightEntryList` gets restyled (new CSS classes), no behavior change to
  its props/API.
- `TotalsSummary` and `BackupSettings` get restyled (new CSS classes), no
  behavior change to their props/API.
- `App.tsx` restructured to render `Sidebar` + the active view's contents
  instead of one long stacked column.

**No changes** to: `db/`, `backup/`, `types/`, `utils/` — none of the data
layer is touched by this phase.

## Out of scope for this phase

- Pixel-accurate LogTen Pro replication (explicitly declined by Gamal).
- Any new logbook features (that's separate future work — certificates,
  crew composition, PDF export, etc., per the top-level app spec).
- Deep linking / URL routing between views.
- Dark mode / theming beyond the one approved palette.
- Mobile-specific layout changes (the sidebar layout is desktop-first,
  matching the mockup; how it should collapse on iPhone-width screens is
  deferred — flagged as an open item below).

## Open item for the implementation plan to resolve

- The mockup's sidebar layout was shown at desktop width only. On a narrow
  phone screen a fixed-width sidebar won't fit well. The plan should include
  a simple responsive fallback (e.g., sidebar collapses to a top tab bar
  below a width breakpoint) rather than leaving the phone experience broken,
  since Gamal uses this on his iPhone too.
