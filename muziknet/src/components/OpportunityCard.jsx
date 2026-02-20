// src/components/OpportunityCard.jsx
import React from "react";
import { MapPin, Calendar, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";

export default function OpportunityCard({ opportunity, onOpen }) {
  if (!opportunity) return null;

  const {
    title,
    organizer,
    type,
    description,
    location,
    date,
    deadline,
    compensation,
    lookingFor = [],
    genres = [],
    status,
  } = opportunity;

  const dateLabel = date ? (typeof date === "object" && date.toDate ? format(date.toDate(), "PPP") : date) : "TBA";
  const deadlineLabel = deadline ? (deadline.toDate ? format(deadline.toDate(), "PPP") : deadline) : null;

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {organizer && <p className="text-sm text-gray-600">{organizer}</p>}
        </div>
        <div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              type === "paid" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-800"
            }`}
          >
            {type || "other"}
          </span>
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-3 line-clamp-3">{description}</p>

      <div className="mt-auto space-y-2 text-gray-600 text-sm">
        {location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{dateLabel}</span>
        </div>
        {deadlineLabel && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Apply by {deadlineLabel}</span>
          </div>
        )}
        {compensation && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>{compensation}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>Looking for: {lookingFor.join(", ") || "Anyone"}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {(genres || []).slice(0, 6).map((g) => (
            <span key={g} className="text-xs px-2 py-1 bg-gray-100 rounded">
              {g}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onOpen(opportunity)}
          className="flex-1 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
        >
          View
        </button>
        <button
          onClick={() => onOpen(opportunity, true)}
          className="flex-1 py-2 rounded border hover:bg-gray-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
