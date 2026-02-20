// src/components/OpportunitiesSidebar.jsx
import React, { useState } from "react";
import { MapPin, Search } from "lucide-react";

/**
 * Sidebar contains:
 * - search input
 * - filters: category/type, location, date range, free/paid/any
 * - simple UI control for pagination (page size selection)
 *
 * Props:
 *  - filters (object)
 *  - onChangeFilters(fn)
 *  - onClear()
 */
export default function OpportunitiesSidebar({ filters = {}, onChangeFilters, onClear }) {
  const [local, setLocal] = useState({
    q: filters.q || "",
    type: filters.type || "",
    location: filters.location || "",
    pageSize: filters.pageSize || 15,
  });

  function update(k, v) {
    const next = { ...local, [k]: v };
    setLocal(next);
    onChangeFilters && onChangeFilters(next);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sticky top-20">
      <h3 className="text-lg font-semibold mb-3">Filter opportunities</h3>

      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            value={local.q}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Search title/organizer..."
            className="pl-10 w-full border rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Type</label>
        <select
          value={local.type}
          onChange={(e) => update("type", e.target.value)}
          className="w-full border rounded-md p-2"
        >
          <option value="">Any</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="scholarship">Scholarship</option>
          <option value="festival">Festival</option>
          <option value="gig">Gig</option>
          <option value="job">Job</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Location</label>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <input
            value={local.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="City or country"
            className="flex-1 border rounded-md p-2"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Per page</label>
        <select
          value={local.pageSize}
          onChange={(e) => update("pageSize", Number(e.target.value))}
          className="w-full border rounded-md p-2"
        >
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={25}>25</option>
        </select>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => onClear && onClear()} className="flex-1 py-2 rounded border">
          Clear
        </button>
      </div>
    </div>
  );
}
