import { beforeEach, describe, expect, it } from "vitest";
import { LogbookDatabase } from "./db";
import { deleteSetting, getSetting, setSetting } from "./settings";

describe("settings", () => {
  let db: LogbookDatabase;

  beforeEach(async () => {
    db = new LogbookDatabase(`settings-test-db-${Math.random()}`);
    await db.open();
  });

  it("returns undefined for a key that has never been set", async () => {
    const value = await getSetting(db, "lastBackupAt");
    expect(value).toBeUndefined();
  });

  it("stores and retrieves a string value", async () => {
    await setSetting(db, "lastBackupAt", "2026-08-29T10:00:00.000Z");
    const value = await getSetting<string>(db, "lastBackupAt");
    expect(value).toBe("2026-08-29T10:00:00.000Z");
  });

  it("overwrites an existing value", async () => {
    await setSetting(db, "lastBackupError", "first error");
    await setSetting(db, "lastBackupError", "second error");
    const value = await getSetting<string>(db, "lastBackupError");
    expect(value).toBe("second error");
  });

  it("deletes a value", async () => {
    await setSetting(db, "lastBackupError", "some error");
    await deleteSetting(db, "lastBackupError");
    const value = await getSetting(db, "lastBackupError");
    expect(value).toBeUndefined();
  });
});
