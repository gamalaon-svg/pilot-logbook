export type CrewRole = "PIC" | "SIC" | "Dual" | "Relief";

export interface FlightEntry {
  id?: number;
  date: string; // ISO "YYYY-MM-DD"
  departure: string;
  arrival: string;
  airline?: string;
  flightNumber?: string;
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
  crew?: string;
}

export const CREW_ROLES: CrewRole[] = ["PIC", "SIC", "Dual", "Relief"];
