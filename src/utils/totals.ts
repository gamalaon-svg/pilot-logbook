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
