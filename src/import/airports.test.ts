import { describe, expect, it } from "vitest";
import { getAirportCoordinates } from "./airports";

describe("getAirportCoordinates", () => {
  it("returns coordinates for a known airport", () => {
    const coords = getAirportCoordinates("DXB");
    expect(coords).toBeDefined();
    expect(coords!.latitude).toBeGreaterThan(24);
    expect(coords!.latitude).toBeLessThan(26);
    expect(coords!.longitude).toBeGreaterThan(54);
    expect(coords!.longitude).toBeLessThan(57);
  });

  it("returns undefined for an unknown code", () => {
    expect(getAirportCoordinates("ZZZZ")).toBeUndefined();
  });
});
