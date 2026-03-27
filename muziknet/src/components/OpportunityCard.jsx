// src/components/OpportunityCard.jsx
import React from "react";
import { MapPin, Calendar, DollarSign, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();
  if (!opportunity) return null;

  const {
    id,
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
  } = opportunity;

  // Safely format dates
  const dateLabel = date ? (typeof date === "object" && date.toDate ? format(date.toDate(), "MMM d, yyyy") : date) : "TBA";
  const deadlineLabel = deadline ? (deadline.toDate ? format(deadline.toDate(), "MMM d") : deadline) : null;

  // Dynamic colors for the "Type" badge
  const getTypeStyles = (oppType) => {
    switch (oppType?.toLowerCase()) {
      case "paid": return "bg-green-100 text-green-700 border-green-200";
      case "unpaid": return "bg-gray-100 text-gray-700 border-gray-200";
      case "scholarship": return "bg-blue-100 text-blue-700 border-blue-200";
      case "job": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-brand-50 text-brand-700 border-brand-100";
    }
  };

  return (
    <div className="glass-card p-5 flex flex-col h-full group hover:-translate-y-1 hover:border-brand-300 transition-all duration-300 cursor-pointer" onClick={() => navigate(`/opportunities/${id}`)}>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-1">{title}</h3>
          {organizer && <p className="text-sm font-medium text-gray-500 mt-0.5">{organizer}</p>}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border flex-shrink-0 ${getTypeStyles(type)}`}>
          {type || "Gig"}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-5 line-clamp-3 leading-relaxed flex-1">
        {description}
      </p>

      {/* Meta Info Grid */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4 text-xs font-medium text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
        {location && (
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">{dateLabel}</span>
        </div>
        {compensation && (
          <div className="flex items-center gap-1.5 truncate">
            <DollarSign className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="truncate text-green-600 font-bold">{compensation}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 truncate">
          <Users className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          <span className="truncate">{lookingFor.length > 0 ? lookingFor[0] : "Anyone"}</span>
        </div>
      </div>

      {/* Footer Area */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
        <div className="flex gap-1.5 overflow-hidden pr-2">
          {(genres || []).slice(0, 2).map((g) => (
            <span key={g} className="text-[10px] font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded-md whitespace-nowrap">
              {g}
            </span>
          ))}
          {(genres || []).length > 2 && (
            <span className="text-[10px] font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded-md">+{genres.length - 2}</span>
          )}
        </div>
        
        {deadlineLabel && (
          <div className="text-[10px] font-bold text-red-500 flex-shrink-0">
            Ends {deadlineLabel}
          </div>
        )}
      </div>
    </div>
  );
}