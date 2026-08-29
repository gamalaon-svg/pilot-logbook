import { ChangeEvent } from "react";
import type { BackupStatus } from "../backup/backupWriter";

interface BackupSettingsProps {
  status: BackupStatus;
  onConnect: () => void;
  onRestoreFile: (file: File) => void;
  onExport: () => void;
  onEmiratesImportFile: (file: File) => void;
}

export function BackupSettings({
  status,
  onConnect,
  onRestoreFile,
  onExport,
  onEmiratesImportFile
}: BackupSettingsProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onRestoreFile(file);
    }
    event.target.value = "";
  }

  function handleEmiratesFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onEmiratesImportFile(file);
    }
    event.target.value = "";
  }

  return (
    <section className="backup-settings">
      {!status.supported && <p>Backup requires Chrome or Edge on Windows.</p>}
      {status.supported && !status.connected && (
        <button type="button" onClick={onConnect}>
          Connect backup folder
        </button>
      )}
      {status.supported && status.connected && (
        <div>
          <p>Backing up to: {status.folderName}</p>
          {status.lastBackupError ? (
            <div>
              <p role="alert">{status.lastBackupError}</p>
              <button type="button" onClick={onConnect}>
                Reconnect folder
              </button>
            </div>
          ) : (
            status.lastBackupAt && <p>Last backup: {status.lastBackupAt}</p>
          )}
        </div>
      )}
      <button type="button" onClick={onExport}>
        Export
      </button>
      <label htmlFor="restoreFile">Import</label>
      <input id="restoreFile" type="file" accept=".csv" onChange={handleFileChange} />
      <label htmlFor="emiratesImportFile">Import Emirates report</label>
      <input id="emiratesImportFile" type="file" accept=".xlsx" onChange={handleEmiratesFileChange} />
    </section>
  );
}
