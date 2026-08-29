import { describe, expect, it } from "vitest";
import { findPilotRole, mapAircraftType, mapEmiratesRow, parseEmiratesDate } from "./emiratesMapping";
import type { RawEmiratesRow } from "./emiratesParser";

describe("parseEmiratesDate", () => {
  it("converts DD-MMM-YYYY to ISO", () => {
    expect(parseEmiratesDate("26-MAY-2011")).toBe("2011-05-26");
  });

  it("throws on an unrecognized format", () => {
    expect(() => parseEmiratesDate("2011-05-26")).toThrow();
  });
});

describe("mapAircraftType", () => {
  it("maps known codes", () => {
    expect(mapAircraftType("A33")).toBe("A330");
    expect(mapAircraftType("380")).toBe("A380");
    expect(mapAircraftType("388")).toBe("A380");
  });

  it("passes through unknown codes unchanged", () => {
    expect(mapAircraftType("B77")).toBe("B77");
  });
});

describe("findPilotRole", () => {
  const crewName = "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)";

  it("finds PIC for a Captain entry", () => {
    expect(findPilotRole(crewName, "143824")).toBe("PIC");
  });

  it("finds SIC for a First Officer entry", () => {
    expect(findPilotRole(crewName, "406191")).toBe("SIC");
  });

  it("returns undefined when the license number isn't in the crew list", () => {
    expect(findPilotRole(crewName, "999999")).toBeUndefined();
  });
});

describe("mapEmiratesRow", () => {
  const baseRow: RawEmiratesRow = {
    flightDate: "26-MAY-2011",
    aircraftType: "A33",
    flightNumber: "0839",
    aircraftRegistration: "A6EAR",
    from: "DXB",
    to: "BAH",
    atd: "12:28",
    ata: "13:39",
    block: "1:11",
    landing: "",
    crewName: "AbdulhamidAllenjawi(143824-CA),GamalOun(406191-FO),TalaTalah(313784-FO)"
  };

  it("maps a row to a FlightEntry", () => {
    const entry = mapEmiratesRow(baseRow, { pilotLicenseNumber: "406191" });

    expect(entry.date).toBe("2011-05-26");
    expect(entry.departure).toBe("DXB");
    expect(entry.arrival).toBe("BAH");
    expect(entry.flightNumber).toBe("0839");
    expect(entry.aircraftType).toBe("A330");
    expect(entry.role).toBe("SIC");
    expect(entry.totalTimeMinutes).toBe(71);
    expect(entry.dayTimeMinutes + entry.nightTimeMinutes).toBe(71);
    expect(entry.ifrTimeMinutes).toBe(71);
    expect(entry.crossCountryTimeMinutes).toBe(71);
    expect(entry.vfrTimeMinutes).toBe(0);
    expect(entry.landingsDay + entry.landingsNight).toBe(0);
  });

  it("counts a landing when Landing is Y", () => {
    const entry = mapEmiratesRow({ ...baseRow, landing: "Y" }, { pilotLicenseNumber: "406191" });
    expect(entry.landingsDay + entry.landingsNight).toBe(1);
  });

  it("throws when the pilot isn't found in the crew list", () => {
    expect(() => mapEmiratesRow(baseRow, { pilotLicenseNumber: "000000" })).toThrow();
  });
});
