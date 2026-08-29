import { describe, expect, it } from "vitest";
import { computeNightTime } from "./nightTime";

describe("computeNightTime", () => {
  it("returns undefined when an airport isn't in the database", () => {
    const result = computeNightTime("ZZZZ", "DXB", new Date("2026-06-15T10:00:00Z"), 60);
    expect(result).toBeUndefined();
  });

  it("computes all-day time for a short midday flight", () => {
    const result = computeNightTime("DXB", "BAH", new Date("2026-06-15T08:00:00Z"), 60);
    expect(result).toBeDefined();
    expect(result!.nightMinutes).toBe(0);
    expect(result!.dayMinutes).toBe(60);
    expect(result!.isArrivalNight).toBe(false);
  });

  it("computes night time for a short flight in the middle of the local night", () => {
    const result = computeNightTime("DXB", "BAH", new Date("2026-06-15T20:00:00Z"), 60);
    expect(result).toBeDefined();
    expect(result!.nightMinutes).toBeGreaterThan(0);
    expect(result!.isArrivalNight).toBe(true);
  });

  it("day and night minutes always sum to the flight's total time", () => {
    const result = computeNightTime("DXB", "LHR", new Date("2026-01-15T16:00:00Z"), 420);
    expect(result).toBeDefined();
    expect(result!.nightMinutes + result!.dayMinutes).toBe(420);
  });
});
