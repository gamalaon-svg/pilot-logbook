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
    airline: "Emirates",
    flightNumber: row.flightNumber ? `EK${row.flightNumber}` : undefined,
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
    remarks: "",
    crew: row.crewName ? row.crewName.split(",").join(", ") : undefined
  };
}
