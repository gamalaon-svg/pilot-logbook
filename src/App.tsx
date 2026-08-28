import { useEffect, useState } from "react";
import { db } from "./db/db";
import { addFlightEntry, deleteFlightEntry, getAllFlightEntries, updateFlightEntry } from "./db/flightEntries";
import { FlightEntryForm } from "./components/FlightEntryForm";
import { FlightEntryList } from "./components/FlightEntryList";
import { TotalsSummary } from "./components/TotalsSummary";
import { BackupSettings } from "./components/BackupSettings";
import { connectBackupFolder, getBackupStatus, writeBackup, type BackupStatus } from "./backup/backupWriter";
import { readAndParseBackupFile, replaceAllFlightEntries } from "./backup/restore";
import type { FlightEntry } from "./types/flightEntry";

const INITIAL_BACKUP_STATUS: BackupStatus = { supported: false, connected: false };

export default function App() {
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FlightEntry | undefined>(undefined);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>(INITIAL_BACKUP_STATUS);

  async function reload() {
    setEntries(await getAllFlightEntries(db));
  }

  async function refreshBackupStatus() {
    setBackupStatus(await getBackupStatus(db));
  }

  useEffect(() => {
    reload();
    refreshBackupStatus();
  }, []);

  async function triggerBackup() {
    await writeBackup(db);
    await refreshBackupStatus();
  }

  async function handleSubmit(entry: FlightEntry) {
    if (editingEntry?.id !== undefined) {
      await updateFlightEntry(db, editingEntry.id, entry);
      setEditingEntry(undefined);
    } else {
      await addFlightEntry(db, entry);
    }
    await reload();
    await triggerBackup();
  }

  async function handleDelete(id: number) {
    await deleteFlightEntry(db, id);
    await reload();
    await triggerBackup();
  }

  async function handleConnect() {
    await connectBackupFolder(db);
    await triggerBackup();
  }

  async function handleRestoreFile(file: File) {
    let parsedEntries: FlightEntry[];
    try {
      parsedEntries = await readAndParseBackupFile(file);
    } catch (err) {
      window.alert(`Could not read backup file: ${(err as Error).message}`);
      return;
    }
    const confirmed = window.confirm(
      `This will replace your current ${entries.length} flight entries with ${parsedEntries.length} entries from this backup. This can't be undone. Continue?`
    );
    if (!confirmed) {
      return;
    }
    await replaceAllFlightEntries(db, parsedEntries);
    await reload();
  }

  return (
    <main>
      <h1>Pilot Logbook</h1>
      <FlightEntryForm key={editingEntry?.id ?? "new"} initialValue={editingEntry} onSubmit={handleSubmit} />
      <FlightEntryList entries={entries} onEdit={setEditingEntry} onDelete={handleDelete} />
      <TotalsSummary entries={entries} />
      <BackupSettings status={backupStatus} onConnect={handleConnect} onRestoreFile={handleRestoreFile} />
    </main>
  );
}
