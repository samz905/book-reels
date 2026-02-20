"use client";

import type { StoryCharacterFE } from "@/app/data/mockCreatorData";

interface CharacterCardProps {
  character: StoryCharacterFE;
  onEdit: (character: StoryCharacterFE) => void;
  onDelete: (characterId: string) => void;
}

export default function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  return (
    <div className="group relative w-[150px] flex-shrink-0">
      {/* Image */}
      <div className="w-[150px] h-[200px] rounded-xl overflow-hidden bg-[#262626] border border-[#262626] relative">
        {(character.imageUrl || character.imageBase64) ? (
          <img
            src={character.imageUrl || `data:${character.imageMimeType};base64,${character.imageBase64}`}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => onEdit(character)}
            className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(character.id)}
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
        <p className="text-white text-sm font-medium truncate">{character.name}</p>
        {character.description && (
          <p className="text-[#ADADAD] text-xs truncate">{character.description}</p>
        )}
      </div>
    </div>
  );
}
