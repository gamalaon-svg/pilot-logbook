import { describe, expect, it } from "vitest";
import { parseHHMM, computeBlockMinutes, formatMinutes } from "./time";

describe("parseHHMM", () => {
  it("parses a valid 24-hour time", () => {
    expect(parseHHMM("08:30")).toBe(510);
    expect(parseHHMM("23:59")).toBe(1439);
    expect(parseHHMM("00:00")).toBe(0);
  });

  it("throws on an invalid time", () => {
    expect(() => parseHHMM("25:00")).toThrow(/Invalid time/);
    expect(() => parseHHMM("bad")).toThrow(/Invalid time/);
  });
});

describe("computeBlockMinutes", () => {
  it("computes duration within the same day", () => {
    expect(computeBlockMinutes("08:00", "10:30")).toBe(150);
  });

  it("wraps past midnight", () => {
    expect(computeBlockMinutes("23:00", "01:00")).toBe(120);
  });

  it("returns 0 for identical off/on times", () => {
    expect(computeBlockMinutes("08:00", "08:00")).toBe(0);
  });
});

describe("formatMinutes", () => {
  it("formats minutes as H:MM", () => {
    expect(formatMinutes(150)).toBe("2:30");
    expect(formatMinutes(5)).toBe("0:05");
    expect(formatMinutes(0)).toBe("0:00");
  });
});
