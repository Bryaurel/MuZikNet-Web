// src/components/BookingFilters.jsx
import React, { useState } from "react";
import { Plus, X, Calendar, DollarSign } from "lucide-react";

export const PRICE_RANGES = [
  "less than $100",
  "$100-$200",
  "$200-$500",
  "$500-$800",
  "$800-$1200",
  "$1200-$1500",
  "$1500-$2000",
  "more than $2000"
];

export default function BookingFilters({ filters, setFilters }) {
  const [instInput, setInstInput] = useState("");
  const [locInput, setLocInput] = useState("");

  const addInstrument = () => {
    if (instInput.trim() && !filters.instruments.includes(instInput.trim())) {
      setFilters({ ...filters, instruments: [...filters.instruments, instInput.trim()] });
      setInstInput("");
    }
  };

  const removeInstrument = (inst) => {
    setFilters({ ...filters, instruments: filters.instruments.filter(i => i !== inst) });
  };

  const addLocation = () => {
    if (locInput.trim() && !filters.locations.includes(locInput.trim())) {
      setFilters({ ...filters, locations: [...filters.locations, locInput.trim()] });
      setLocInput("");
    }
  };

  const removeLocation = (loc) => {
    setFilters({ ...filters, locations: filters.locations.filter(l => l !== loc) });
  };

  return (
    <div className="space-y-6">
      
      {/* INSTRUMENTS */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Instruments / Skills</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={instInput} 
            onChange={e => setInstInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addInstrument()}
            placeholder="e.g. Guitar, DJ" 
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:border-brand-500 outline-none w-full min-w-0" 
          />
          <button onClick={addInstrument} className="flex-shrink-0 px-3 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.instruments.map(inst => (
            <span key={inst} className="flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-100 px-2.5 py-1 rounded-lg text-xs font-bold">
              {inst} <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeInstrument(inst)} />
            </span>
          ))}
        </div>
      </div>

      {/* LOCATIONS */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Locations</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={locInput} 
            onChange={e => setLocInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addLocation()}
            placeholder="e.g. Kigali" 
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:border-brand-500 outline-none w-full min-w-0" 
          />
          <button onClick={addLocation} className="flex-shrink-0 px-3 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.locations.map(loc => (
            <span key={loc} className="flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-bold">
              {loc} <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeLocation(loc)} />
            </span>
          ))}
        </div>
      </div>

      {/* BUDGET / PRICE RANGE */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-green-500" /> Budget
        </label>
        <select 
          value={filters.priceRange} 
          onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:border-brand-500 outline-none text-gray-700"
        >
          <option value="">Any Budget</option>
          {PRICE_RANGES.map(range => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>
      </div>

      {/* AVAILABILITY CALENDAR */}
      <div className="border-t border-gray-100 pt-5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-brand-500" /> Availability Range
        </label>
        <div className="space-y-3">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">From</span>
            <input 
              type="date" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:border-brand-500 outline-none text-gray-700 mt-1"
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value ? new Date(e.target.value) : null})}
            />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">To</span>
            <input 
              type="date" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:border-brand-500 outline-none text-gray-700 mt-1"
              onChange={(e) => setFilters({...filters, dateTo: e.target.value ? new Date(e.target.value) : null})}
            />
          </div>
        </div>
      </div>

    </div>
  );
}