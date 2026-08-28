import Dexie, { Table } from "dexie";
import type { FlightEntry } from "../types/flightEntry";

export class LogbookDatabase extends Dexie {
  declare flightEntries: Table<FlightEntry, number>;

  constructor(name = "LogbookDatabase") {
    super(name);
    this.version(1).stores({
      flightEntries: "++id, date, aircraftType, role"
    });
  }
}

export const db = new LogbookDatabase();
