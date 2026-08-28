import { FlightEntry } from "../types/flightEntry";
import { formatMinutes } from "../utils/time";

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
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>From</th>
          <th>To</th>
          <th>Aircraft</th>
          <th>Total time</th>
          <th>Role</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.date}</td>
            <td>{entry.departure}</td>
            <td>{entry.arrival}</td>
            <td>{entry.aircraftType}</td>
            <td>{formatMinutes(entry.totalTimeMinutes)}</td>
            <td>{entry.role}</td>
            <td>
              <button type="button" onClick={() => onEdit(entry)}>
                Edit
              </button>
              <button type="button" onClick={() => entry.id !== undefined && onDelete(entry.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
