import airportsData from "./airports.json";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const AIRPORTS = airportsData as Record<string, [number, number]>;

export function getAirportCoordinates(iataCode: string): Coordinates | undefined {
  const entry = AIRPORTS[iataCode];
  if (!entry) {
    return undefined;
  }
  return { latitude: entry[0], longitude: entry[1] };
}
