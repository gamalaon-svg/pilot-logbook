import { useEffect, useState } from "react";
import { db } from "./db/db";
import { addFlightEntry, deleteFlightEntry, getAllFlightEntries, updateFlightEntry } from "./db/flightEntries";
import { FlightEntryForm } from "./components/FlightEntryForm";
import { FlightEntryList } from "./components/FlightEntryList";
import { TotalsSummary } from "./components/TotalsSummary";
import type { FlightEntry } from "./types/flightEntry";

export default function App() {
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FlightEntry | undefined>(undefined);

  async function reload() {
    setEntries(await getAllFlightEntries(db));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSubmit(entry: FlightEntry) {
    if (editingEntry?.id !== undefined) {
      await updateFlightEntry(db, editingEntry.id, entry);
      setEditingEntry(undefined);
    } else {
      await addFlightEntry(db, entry);
    }
    await reload();
  }

  async function handleDelete(id: number) {
    await deleteFlightEntry(db, id);
    await reload();
  }

  return (
    <main>
      <h1>Pilot Logbook</h1>
      <FlightEntryForm key={editingEntry?.id ?? "new"} initialValue={editingEntry} onSubmit={handleSubmit} />
      <FlightEntryList entries={entries} onEdit={setEditingEntry} onDelete={handleDelete} />
      <TotalsSummary entries={entries} />
    </main>
  );
}
