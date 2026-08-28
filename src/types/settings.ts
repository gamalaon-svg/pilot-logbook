export type SettingKey = "backupDirectoryHandle" | "lastBackupAt" | "lastBackupError";

export interface SettingRecord {
  key: SettingKey;
  value: unknown;
}
