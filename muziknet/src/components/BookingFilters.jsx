// src/components/BookingFilters.jsx
import { useState } from "react";

/**
 * BookingFilters
 * - instruments: multi-select (choose up to 5) — uses the exhaustive list you approved
 * - locations: simple input tags (user types location & presses Enter)
 * - dateFrom/dateTo: date inputs
 *
 * Props:
 * - filters, setFilters
 */

const ALL_INSTRUMENTS = [
  "Guitar","Bass","Violin","Cello","Drums","Percussion","Saxophone","Trumpet","Flute",
  "Organ","Accordion","Piano","Singer","Pop","Rock","Jazz","Blues","Classical","Folk",
  "Traditional","Gospel","Reggae","Hip-Hop","R&B","Afrobeats","Amapiano","Band","Orchestra",
  "Choir","DJ","Composer","Producer","Music Theory"
];

export default function BookingFilters({ filters, setFilters }) {
  const [locInput, setLocInput] = useState("");

  const toggleInstrument = (ins) => {
    const current = filters.instruments || [];
    if (current.includes(ins)) {
      setFilters({ ...filters, instruments: current.filter(i => i !== ins) });
    } else {
      if (current.length >= 5) return; // respect maximum
      setFilters({ ...filters, instruments: [...current, ins] });
    }
  };

  const addLocation = () => {
    const v = locInput.trim();
    if (!v) return;
    const cur = filters.locations || [];
    if (!cur.includes(v)) setFilters({ ...filters, locations: [...cur, v] });
    setLocInput("");
  };

  const removeLocation = (l) => {
    setFilters({ ...filters, locations: (filters.locations || []).filter(x => x !== l) });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-2">Filters</h3>

      <div className="mb-4">
        <label className="text-sm font-medium">Instruments / Skills</label>
        <div className="mt-2 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
          {ALL_INSTRUMENTS.map(ins => {
            const active = (filters.instruments || []).includes(ins);
            return (
              <button
                key={ins}
                onClick={() => toggleInstrument(ins)}
                className={`text-sm px-2 py-1 rounded text-left ${active ? "bg-purple-600 text-white" : "bg-gray-100"}`}
                title={ins}
              >
                {ins}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 mt-1">Select up to 5.</div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium">Locations</label>
        <div className="flex gap-2 mt-2">
          <input
            value={locInput}
            onChange={(e) => setLocInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLocation()}
            placeholder="Add location (press Enter)"
            className="flex-1 border px-2 py-1 rounded"
          />
          <button onClick={addLocation} className="px-3 py-1 bg-gray-200 rounded">Add</button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {(filters.locations || []).map(l => (
            <div key={l} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-2">
              {l} <button onClick={() => removeLocation(l)} className="text-xs text-gray-500">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium">Availability</label>
        <div className="flex gap-2 mt-2">
          <label className="text-sm font-light">From:</label>
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || null })}
            className="border px-2 py-1 rounded"
          />
        </div>
        <br></br>
        <div>
          <label className="text-sm font-light">To:  </label>
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || null })}
            className="border px-2 py-1 rounded"
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">Optional — results will not be filtered strictly by availability yet.</div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFilters({ instruments: [], locations: [], dateFrom: null, dateTo: null})}
          className="px-3 py-1 bg-gray-200 rounded">Clear</button>
      </div>
    </div>
  );
}
