import Dexie, { Table } from "dexie";
import type { FlightEntry } from "../types/flightEntry";
import type { SettingRecord } from "../types/settings";

export class LogbookDatabase extends Dexie {
  declare flightEntries: Table<FlightEntry, number>;
  declare settings: Table<SettingRecord, string>;

  constructor(name = "LogbookDatabase") {
    super(name);
    this.version(1).stores({
      flightEntries: "++id, date, aircraftType, role"
    });
    this.version(2).stores({
      flightEntries: "++id, date, aircraftType, role",
      settings: "key"
    });
  }
}

export const db = new LogbookDatabase();
