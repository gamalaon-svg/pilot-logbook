import { FormEvent, useState } from "react";
import { CREW_ROLES, CrewRole, FlightEntry } from "../types/flightEntry";
import { computeBlockMinutes } from "../utils/time";

interface FlightEntryFormProps {
  initialValue?: FlightEntry;
  onSubmit: (entry: FlightEntry) => void;
}

type FormState = Omit<
  FlightEntry,
  | "totalTimeMinutes"
  | "dayTimeMinutes"
  | "nightTimeMinutes"
  | "ifrTimeMinutes"
  | "vfrTimeMinutes"
  | "crossCountryTimeMinutes"
  | "landingsDay"
  | "landingsNight"
> & {
  dayTimeMinutes: string;
  nightTimeMinutes: string;
  ifrTimeMinutes: string;
  vfrTimeMinutes: string;
  crossCountryTimeMinutes: string;
  landingsDay: string;
  landingsNight: string;
};

function emptyState(initial?: FlightEntry): FormState {
  return {
    id: initial?.id,
    date: initial?.date ?? "",
    departure: initial?.departure ?? "",
    arrival: initial?.arrival ?? "",
    flightNumber: initial?.flightNumber ?? "",
    aircraftType: initial?.aircraftType ?? "",
    aircraftRegistration: initial?.aircraftRegistration ?? "",
    blockOffTime: initial?.blockOffTime ?? "",
    blockOnTime: initial?.blockOnTime ?? "",
    role: initial?.role ?? "PIC",
    dayTimeMinutes: initial ? String(initial.dayTimeMinutes) : "",
    nightTimeMinutes: initial ? String(initial.nightTimeMinutes) : "",
    ifrTimeMinutes: initial ? String(initial.ifrTimeMinutes) : "",
    vfrTimeMinutes: initial ? String(initial.vfrTimeMinutes) : "",
    crossCountryTimeMinutes: initial ? String(initial.crossCountryTimeMinutes) : "",
    landingsDay: initial ? String(initial.landingsDay) : "",
    landingsNight: initial ? String(initial.landingsNight) : "",
    approaches: initial?.approaches ?? "",
    remarks: initial?.remarks ?? ""
  };
}

export function FlightEntryForm({ initialValue, onSubmit }: FlightEntryFormProps) {
  const [form, setForm] = useState<FormState>(() => emptyState(initialValue));
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const totalTimeMinutes = computeBlockMinutes(form.blockOffTime, form.blockOnTime);
      const entry: FlightEntry = {
        id: form.id,
        date: form.date,
        departure: form.departure,
        arrival: form.arrival,
        flightNumber: form.flightNumber.trim() || undefined,
        aircraftType: form.aircraftType,
        aircraftRegistration: form.aircraftRegistration,
        blockOffTime: form.blockOffTime,
        blockOnTime: form.blockOnTime,
        totalTimeMinutes,
        role: form.role as CrewRole,
        dayTimeMinutes: Number(form.dayTimeMinutes) || 0,
        nightTimeMinutes: Number(form.nightTimeMinutes) || 0,
        ifrTimeMinutes: Number(form.ifrTimeMinutes) || 0,
        vfrTimeMinutes: Number(form.vfrTimeMinutes) || 0,
        crossCountryTimeMinutes: Number(form.crossCountryTimeMinutes) || 0,
        landingsDay: Number(form.landingsDay) || 0,
        landingsNight: Number(form.landingsNight) || 0,
        approaches: form.approaches,
        remarks: form.remarks
      };
      onSubmit(entry);
      setForm(emptyState());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flight-form">
      <label htmlFor="date">Date</label>
      <input id="date" type="text" value={form.date} onChange={handleChange("date")} />

      <label htmlFor="departure">Departure</label>
      <input id="departure" type="text" value={form.departure} onChange={handleChange("departure")} />

      <label htmlFor="arrival">Arrival</label>
      <input id="arrival" type="text" value={form.arrival} onChange={handleChange("arrival")} />

      <label htmlFor="flightNumber">Flight number</label>
      <input id="flightNumber" type="text" value={form.flightNumber ?? ""} onChange={handleChange("flightNumber")} />

      <label htmlFor="aircraftType">Aircraft type</label>
      <input id="aircraftType" type="text" value={form.aircraftType} onChange={handleChange("aircraftType")} />

      <label htmlFor="aircraftRegistration">Registration</label>
      <input
        id="aircraftRegistration"
        type="text"
        value={form.aircraftRegistration}
        onChange={handleChange("aircraftRegistration")}
      />

      <label htmlFor="blockOffTime">Block off</label>
      <input id="blockOffTime" type="text" value={form.blockOffTime} onChange={handleChange("blockOffTime")} />

      <label htmlFor="blockOnTime">Block on</label>
      <input id="blockOnTime" type="text" value={form.blockOnTime} onChange={handleChange("blockOnTime")} />

      <label htmlFor="role">Role</label>
      <select id="role" value={form.role} onChange={handleChange("role")}>
        {CREW_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <label htmlFor="dayTimeMinutes">Day time (minutes)</label>
      <input id="dayTimeMinutes" type="text" value={form.dayTimeMinutes} onChange={handleChange("dayTimeMinutes")} />

      <label htmlFor="nightTimeMinutes">Night time (minutes)</label>
      <input
        id="nightTimeMinutes"
        type="text"
        value={form.nightTimeMinutes}
        onChange={handleChange("nightTimeMinutes")}
      />

      <label htmlFor="ifrTimeMinutes">IFR time (minutes)</label>
      <input id="ifrTimeMinutes" type="text" value={form.ifrTimeMinutes} onChange={handleChange("ifrTimeMinutes")} />

      <label htmlFor="vfrTimeMinutes">VFR time (minutes)</label>
      <input id="vfrTimeMinutes" type="text" value={form.vfrTimeMinutes} onChange={handleChange("vfrTimeMinutes")} />

      <label htmlFor="crossCountryTimeMinutes">Cross-country time (minutes)</label>
      <input
        id="crossCountryTimeMinutes"
        type="text"
        value={form.crossCountryTimeMinutes}
        onChange={handleChange("crossCountryTimeMinutes")}
      />

      <label htmlFor="landingsDay">Day landings</label>
      <input id="landingsDay" type="text" value={form.landingsDay} onChange={handleChange("landingsDay")} />

      <label htmlFor="landingsNight">Night landings</label>
      <input id="landingsNight" type="text" value={form.landingsNight} onChange={handleChange("landingsNight")} />

      <label htmlFor="approaches">Approaches</label>
      <input id="approaches" type="text" value={form.approaches} onChange={handleChange("approaches")} />

      <label htmlFor="remarks">Remarks</label>
      <input id="remarks" type="text" value={form.remarks} onChange={handleChange("remarks")} />

      {error && <p role="alert">{error}</p>}

      <button type="submit">Save</button>
    </form>
  );
}
