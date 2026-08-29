import { getPosition } from "suncalc";
import { getAirportCoordinates } from "./airports";

const CIVIL_TWILIGHT_ALTITUDE_DEGREES = -6;

function isNight(date: Date, latitude: number, longitude: number): boolean {
  const { altitude } = getPosition(date, latitude, longitude);
  const altitudeDegrees = (altitude * 180) / Math.PI;
  return altitudeDegrees < CIVIL_TWILIGHT_ALTITUDE_DEGREES;
}

function interpolate(a: number, b: number, fraction: number): number {
  return a + (b - a) * fraction;
}

export interface NightTimeResult {
  nightMinutes: number;
  dayMinutes: number;
  isArrivalNight: boolean;
}

export function computeNightTime(
  departureIata: string,
  arrivalIata: string,
  departureUtc: Date,
  totalMinutes: number
): NightTimeResult | undefined {
  const departureCoords = getAirportCoordinates(departureIata);
  const arrivalCoords = getAirportCoordinates(arrivalIata);
  if (!departureCoords || !arrivalCoords) {
    return undefined;
  }

  const sampleCount = Math.max(2, Math.round(totalMinutes / 5));
  let nightSamples = 0;

  for (let i = 0; i <= sampleCount; i += 1) {
    const fraction = i / sampleCount;
    const sampleTime = new Date(departureUtc.getTime() + fraction * totalMinutes * 60_000);
    const latitude = interpolate(departureCoords.latitude, arrivalCoords.latitude, fraction);
    const longitude = interpolate(departureCoords.longitude, arrivalCoords.longitude, fraction);
    if (isNight(sampleTime, latitude, longitude)) {
      nightSamples += 1;
    }
  }

  const nightMinutes = Math.round((nightSamples / (sampleCount + 1)) * totalMinutes);
  const arrivalTime = new Date(departureUtc.getTime() + totalMinutes * 60_000);
  const isArrivalNight = isNight(arrivalTime, arrivalCoords.latitude, arrivalCoords.longitude);

  return {
    nightMinutes,
    dayMinutes: totalMinutes - nightMinutes,
    isArrivalNight
  };
}
