import { FlightEntry } from "../types/flightEntry";
import { formatMinutes } from "../utils/time";
import { getAirlineLogoUrl } from "./airlineLogos";

interface FlightEntryListProps {
  entries: FlightEntry[];
  onEdit: (entry: FlightEntry) => void;
  onDelete: (id: number) => void;
}

export function FlightEntryList({ entries, onEdit, onDelete }: FlightEntryListProps) {
  if (entries.length === 0) {
    return <p>No flight entries yet.</p>;
  }

  return (
    <div className="logbook-table-wrap">
      <table className="logbook-table">
        <thead>
          <tr>
            <th>Airline</th>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Flight #</th>
            <th>Aircraft</th>
            <th>Total time</th>
            <th>Role</th>
            <th>Crew</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const logoUrl = getAirlineLogoUrl(entry.airline);
            return (
              <tr key={entry.id}>
                <td className="logbook-table-airline">
                  {logoUrl ? <img src={logoUrl} alt={entry.airline} className="airline-logo" /> : entry.airline}
                </td>
                <td>{entry.date}</td>
                <td>{entry.departure}</td>
                <td>{entry.arrival}</td>
                <td>{entry.flightNumber}</td>
                <td>{entry.aircraftType}</td>
                <td>{formatMinutes(entry.totalTimeMinutes)}</td>
                <td>{entry.role}</td>
                <td className="logbook-table-crew">{entry.crew}</td>
                <td>
                  <button type="button" onClick={() => onEdit(entry)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => entry.id !== undefined && onDelete(entry.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
