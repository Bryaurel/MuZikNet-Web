import React from "react";

export default function DefaultAvatar({ className = "w-10 h-10 text-lg" }) {
  return (
    <div className={`flex items-center justify-center bg-gray-100 border border-gray-200 rounded-full overflow-hidden flex-shrink-0 ${className}`}>
      <span className="select-none">🎵</span>
    </div>
  );
}