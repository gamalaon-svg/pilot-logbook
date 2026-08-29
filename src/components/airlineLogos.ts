const AIRLINE_LOGOS: Record<string, string> = {
  Emirates: "logos/emirates.png"
};

export function getAirlineLogoUrl(airline: string | undefined): string | undefined {
  if (!airline) {
    return undefined;
  }
  const path = AIRLINE_LOGOS[airline];
  if (!path) {
    return undefined;
  }
  return `${import.meta.env.BASE_URL}${path}`;
}
