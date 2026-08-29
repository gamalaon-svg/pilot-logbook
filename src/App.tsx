import { useEffect, useState } from "react";
import { db } from "./db/db";
import { addFlightEntry, deleteFlightEntry, getAllFlightEntries, updateFlightEntry } from "./db/flightEntries";
import { FlightEntryForm } from "./components/FlightEntryForm";
import { FlightEntryList } from "./components/FlightEntryList";
import { TotalsSummary } from "./components/TotalsSummary";
import { BackupSettings } from "./components/BackupSettings";
import { Sidebar, type ViewName } from "./components/Sidebar";
import { StatCards } from "./components/StatCards";
import { connectBackupFolder, getBackupStatus, writeBackup, type BackupStatus } from "./backup/backupWriter";
import { readAndParseBackupFile, replaceAllFlightEntries } from "./backup/restore";
import { flightEntriesToCsv } from "./backup/csv";
import { downloadCsv } from "./backup/downloadCsv";
import { commitEmiratesImport, prepareEmiratesImport } from "./import/emiratesImport";
import type { FlightEntry } from "./types/flightEntry";

const INITIAL_BACKUP_STATUS: BackupStatus = { supported: false, connected: false };
const EMIRATES_PILOT_LICENSE_NUMBER = "406191";

export default function App() {
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<FlightEntry | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>("logbook");
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

  function handleStartAdd() {
    setEditingEntry(undefined);
    setIsFormOpen(true);
  }

  function handleEdit(entry: FlightEntry) {
    setEditingEntry(entry);
    setIsFormOpen(true);
  }

  function handleCancelForm() {
    setEditingEntry(undefined);
    setIsFormOpen(false);
  }

  async function handleSubmit(entry: FlightEntry) {
    if (editingEntry?.id !== undefined) {
      await updateFlightEntry(db, editingEntry.id, entry);
    } else {
      await addFlightEntry(db, entry);
    }
    setEditingEntry(undefined);
    setIsFormOpen(false);
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

  function handleExport() {
    const csv = flightEntriesToCsv(entries);
    downloadCsv(`logbook-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function handleEmiratesImportFile(file: File) {
    let preview: Awaited<ReturnType<typeof prepareEmiratesImport>>;
    try {
      preview = await prepareEmiratesImport(db, file, EMIRATES_PILOT_LICENSE_NUMBER);
    } catch (err) {
      window.alert(`Could not read Emirates report: ${(err as Error).message}`);
      return;
    }
    if (preview.newEntries.length === 0) {
      window.alert(`No new flights found. ${preview.totalInFile} flights in file, all already in your logbook.`);
      return;
    }
    const confirmed = window.confirm(
      `${preview.totalInFile} flights found in file, ${preview.newEntries.length} new, ${preview.duplicateCount} already in your logbook. Add the ${preview.newEntries.length} new flights?`
    );
    if (!confirmed) {
      return;
    }
    await commitEmiratesImport(db, preview.newEntries);
    await reload();
    await triggerBackup();
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onSelectView={setActiveView} />
      <main className="app-main">
        {activeView === "logbook" && (
          <section>
            <div className="view-header">
              <h1>Logbook</h1>
              {!isFormOpen && (
                <button type="button" className="add-flight-btn" onClick={handleStartAdd}>
                  + Add Flight
                </button>
              )}
            </div>
            <StatCards entries={entries} />
            {isFormOpen && (
              <div className="add-flight-panel">
                <FlightEntryForm key={editingEntry?.id ?? "new"} initialValue={editingEntry} onSubmit={handleSubmit} />
                <button type="button" className="cancel-btn" onClick={handleCancelForm}>
                  Cancel
                </button>
              </div>
            )}
            <FlightEntryList entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
          </section>
        )}
        {activeView === "totals" && (
          <section>
            <div className="view-header">
              <h1>Totals</h1>
            </div>
            <TotalsSummary entries={entries} />
          </section>
        )}
        {activeView === "backup" && (
          <section>
            <div className="view-header">
              <h1>Backup</h1>
            </div>
            <BackupSettings
              status={backupStatus}
              onConnect={handleConnect}
              onRestoreFile={handleRestoreFile}
              onExport={handleExport}
              onEmiratesImportFile={handleEmiratesImportFile}
            />
          </section>
        )}
      </main>
    </div>
  );
}
