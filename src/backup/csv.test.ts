import { describe, expect, it } from "vitest";
import { CsvFormatError, flightEntriesToCsv, parseFlightEntriesCsv } from "./csv";
import type { FlightEntry } from "../types/flightEntry";

const sampleEntry: FlightEntry = {
  date: "2026-08-20",
  departure: "OMDB",
  arrival: "EGLL",
  airline: "Emirates",
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
  remarks: "Great flight",
  crew: "John Smith (CA), Jane Doe (FO)"
};

describe("flightEntriesToCsv", () => {
  it("writes a header row and one data row", () => {
    const csv = flightEntriesToCsv([sampleEntry]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "date,departure,arrival,airline,flightNumber,aircraftType,aircraftRegistration,blockOffTime,blockOnTime,totalTimeMinutes,role,dayTimeMinutes,nightTimeMinutes,ifrTimeMinutes,vfrTimeMinutes,crossCountryTimeMinutes,landingsDay,landingsNight,approaches,remarks,crew"
    );
    expect(lines[1]).toBe(
      '2026-08-20,OMDB,EGLL,Emirates,EK0839,B777,A6-EXAMPLE,08:00,15:30,450,PIC,450,0,450,0,450,1,0,ILS x1,Great flight,"John Smith (CA), Jane Doe (FO)"'
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
      '2026-08-20,OMDB,EGLL,Emirates,,B777,A6-EXAMPLE,08:00,15:30,450,PIC,450,0,450,0,450,1,0,ILS x1,Great flight,"John Smith (CA), Jane Doe (FO)"'
    );
  });

  it("writes an empty field when crew is not set", () => {
    const { crew, ...rest } = sampleEntry;
    const csv = flightEntriesToCsv([rest as FlightEntry]);
    expect(csv.split("\n")[1]).toBe(
      "2026-08-20,OMDB,EGLL,Emirates,EK0839,B777,A6-EXAMPLE,08:00,15:30,450,PIC,450,0,450,0,450,1,0,ILS x1,Great flight,"
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
