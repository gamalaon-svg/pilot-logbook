import { FlightEntry } from "../types/flightEntry";
import { totalMinutesByAircraftType, totalMinutesByRole, totalMinutesByYear } from "../utils/totals";
import { formatMinutes } from "../utils/time";

interface TotalsSummaryProps {
  entries: FlightEntry[];
}

function TotalsTable({ title, totals }: { title: string; totals: Record<string, number> }) {
  return (
    <div className="totals-block">
      <h3>{title}</h3>
      <ul>
        {Object.entries(totals).map(([key, minutes]) => (
          <li key={key}>
            {key}: {formatMinutes(minutes)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TotalsSummary({ entries }: TotalsSummaryProps) {
  return (
    <section className="totals-summary">
      <TotalsTable title="By aircraft type" totals={totalMinutesByAircraftType(entries)} />
      <TotalsTable title="By role" totals={totalMinutesByRole(entries)} />
      <TotalsTable title="By year" totals={totalMinutesByYear(entries)} />
    </section>
  );
}
