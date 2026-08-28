export function parseHHMM(value: string): number {
  const match = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid time "${value}", expected HH:MM in 24-hour format`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function computeBlockMinutes(blockOffTime: string, blockOnTime: string): number {
  const off = parseHHMM(blockOffTime);
  const on = parseHHMM(blockOnTime);
  const diff = on - off;
  return diff >= 0 ? diff : diff + 24 * 60;
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}
