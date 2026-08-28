import type { LogbookDatabase } from "./db";
import type { SettingKey } from "../types/settings";

export async function getSetting<T = unknown>(db: LogbookDatabase, key: SettingKey): Promise<T | undefined> {
  const record = await db.settings.get(key);
  return record?.value as T | undefined;
}

export async function setSetting(db: LogbookDatabase, key: SettingKey, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function deleteSetting(db: LogbookDatabase, key: SettingKey): Promise<void> {
  await db.settings.delete(key);
}
