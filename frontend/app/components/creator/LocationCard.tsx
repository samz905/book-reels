"use client";

import type { StoryLocationFE } from "@/app/data/mockCreatorData";

interface LocationCardProps {
  location: StoryLocationFE;
  onEdit: (location: StoryLocationFE) => void;
  onDelete: (locationId: string) => void;
}

export default function LocationCard({ location, onEdit, onDelete }: LocationCardProps) {
  return (
    <div className="group relative w-[150px] flex-shrink-0">
      {/* Image */}
      <div className="w-[150px] h-[200px] rounded-xl overflow-hidden bg-[#262626] border border-[#262626] relative">
        {(location.imageUrl || location.imageBase64) ? (
          <img
            src={location.imageUrl || `data:${location.imageMimeType};base64,${location.imageBase64}`}
            alt={location.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => onEdit(location)}
            className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(location.id)}
            className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <p className="text-white text-sm font-medium truncate">{location.name}</p>
          {(location.angles?.length || 0) > 1 && (
            <span className="text-[10px] text-[#B8B6FC] bg-[#262550] px-1.5 py-0.5 rounded-full flex-shrink-0">
              {location.angles!.length} angles
            </span>
          )}
        </div>
        <p className="text-[#ADADAD] text-xs truncate">
          {location.description || "No description"}
        </p>
      </div>
    </div>
  );
}
