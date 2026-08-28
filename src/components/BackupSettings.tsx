import { ChangeEvent } from "react";
import type { BackupStatus } from "../backup/backupWriter";

interface BackupSettingsProps {
  status: BackupStatus;
  onConnect: () => void;
  onRestoreFile: (file: File) => void;
}

export function BackupSettings({ status, onConnect, onRestoreFile }: BackupSettingsProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onRestoreFile(file);
    }
    event.target.value = "";
  }

  return (
    <section>
      <h2>Backup</h2>
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
      <label htmlFor="restoreFile">Restore from backup</label>
      <input id="restoreFile" type="file" accept=".csv" onChange={handleFileChange} />
    </section>
  );
}
