import type { LogbookDatabase } from "../db/db";
import { deleteSetting, getSetting, setSetting } from "../db/settings";
import { getAllFlightEntries } from "../db/flightEntries";
import { flightEntriesToCsv } from "./csv";

const BACKUP_FILE_NAME = "logbook-backup.csv";

export function isBackupSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function connectBackupFolder(db: LogbookDatabase): Promise<void> {
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return;
    }
    throw err;
  }
  await setSetting(db, "backupDirectoryHandle", handle);
  await deleteSetting(db, "lastBackupError");
}

export async function writeBackup(db: LogbookDatabase): Promise<void> {
  const handle = await getSetting<FileSystemDirectoryHandle>(db, "backupDirectoryHandle");
  if (!handle) {
    return;
  }
  try {
    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      await setSetting(db, "lastBackupError", "Reconnect needed");
      return;
    }
    const entries = await getAllFlightEntries(db);
    const csv = flightEntriesToCsv(entries);
    const fileHandle = await handle.getFileHandle(BACKUP_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(csv);
    await writable.close();
    await setSetting(db, "lastBackupAt", new Date().toISOString());
    await deleteSetting(db, "lastBackupError");
  } catch (err) {
    await setSetting(db, "lastBackupError", (err as Error).message);
  }
}

export interface BackupStatus {
  supported: boolean;
  connected: boolean;
  folderName?: string;
  lastBackupAt?: string;
  lastBackupError?: string;
}

export async function getBackupStatus(db: LogbookDatabase): Promise<BackupStatus> {
  const handle = await getSetting<FileSystemDirectoryHandle>(db, "backupDirectoryHandle");
  const lastBackupAt = await getSetting<string>(db, "lastBackupAt");
  const lastBackupError = await getSetting<string>(db, "lastBackupError");
  return {
    supported: isBackupSupported(),
    connected: handle !== undefined,
    folderName: handle?.name,
    lastBackupAt,
    lastBackupError
  };
}
