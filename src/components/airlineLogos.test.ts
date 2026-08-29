import { describe, expect, it } from "vitest";
import { getAirlineLogoUrl } from "./airlineLogos";

describe("getAirlineLogoUrl", () => {
  it("returns a URL for a known airline", () => {
    expect(getAirlineLogoUrl("Emirates")).toBe(`${import.meta.env.BASE_URL}logos/emirates.png`);
  });

  it("returns undefined for an unknown airline", () => {
    expect(getAirlineLogoUrl("Some Other Airline")).toBeUndefined();
  });

  it("returns undefined when no airline is given", () => {
    expect(getAirlineLogoUrl(undefined)).toBeUndefined();
  });
});
