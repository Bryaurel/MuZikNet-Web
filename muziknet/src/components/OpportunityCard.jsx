// src/components/OpportunityCard.jsx
import React from "react";
import { MapPin, Calendar, DollarSign, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Small reusable card for opportunity listing.
 * Props:
 *  - opportunity: object from Firestore
 *  - onView: optional callback
 *  - compact: if true, smaller layout
 */
export default function OpportunityCard({ opportunity, compact = false }) {
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate(`/opportunities/${opportunity.id}`);
  };

  const dateText = opportunity.deadline
    ? (opportunity.deadline.toDate ? opportunity.deadline.toDate().toLocaleDateString() : new Date(opportunity.deadline).toLocaleDateString())
    : "No deadline";

  return (
    <div className={`bg-white border rounded-lg shadow-sm overflow-hidden ${compact ? "p-3" : "p-4"} flex flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-gray-900 font-semibold line-clamp-2">{opportunity.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{opportunity.organizer || "Organizer"}</p>
        </div>

        <div className="ml-2 flex-shrink-0 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs ${opportunity.type === "paid" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
            {opportunity.type || "other"}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-700 mt-3 line-clamp-3">{opportunity.description}</p>

      <div className="mt-3 text-sm text-gray-600 space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{opportunity.location || "Remote / unspecified"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{dateText}</span>
        </div>
        {opportunity.fees !== undefined && opportunity.fees !== null && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>{opportunity.fees ? opportunity.fees : "No fee"}</span>
          </div>
        )}
        {opportunity.lookingFor && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Looking for: {Array.isArray(opportunity.lookingFor) ? opportunity.lookingFor.join(", ") : opportunity.lookingFor}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={handleOpen} className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm">
          View
        </button>

        <div className="text-xs text-gray-500">
          {opportunity.status === "approved" ? "Approved" : opportunity.status === "pending" ? "Pending review" : "Not approved"}
        </div>
      </div>
    </div>
  );
}
