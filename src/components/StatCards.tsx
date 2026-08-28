import { FlightEntry } from "../types/flightEntry";
import { sumMinutesForYear, sumTotalLandings, sumTotalMinutes, totalMinutesByRole } from "../utils/totals";
import { formatMinutes } from "../utils/time";

interface StatCardsProps {
  entries: FlightEntry[];
}

export function StatCards({ entries }: StatCardsProps) {
  const currentYear = new Date().getFullYear();
  const picMinutes = totalMinutesByRole(entries).PIC ?? 0;

  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="stat-label">Total time</div>
        <div className="stat-value">{formatMinutes(sumTotalMinutes(entries))}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">PIC</div>
        <div className="stat-value">{formatMinutes(picMinutes)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">This year</div>
        <div className="stat-value">{formatMinutes(sumMinutesForYear(entries, currentYear))}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Landings</div>
        <div className="stat-value">{sumTotalLandings(entries)}</div>
      </div>
    </div>
  );
}
