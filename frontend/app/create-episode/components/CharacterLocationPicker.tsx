"use client";

import { useState } from "react";
import type { StoryCharacterFE, StoryLocationFE } from "@/app/data/mockCreatorData";

export interface SelectedCharacter extends StoryCharacterFE {
  episodeRole: "protagonist" | "antagonist" | "supporting";
}

interface CharacterLocationPickerProps {
  storyCharacters: StoryCharacterFE[];
  storyLocations: StoryLocationFE[];
  selectedStyle: string;
  selectedCharacters: SelectedCharacter[];
  selectedLocation: StoryLocationFE | null;
  onCharactersChange: (chars: SelectedCharacter[]) => void;
  onLocationChange: (loc: StoryLocationFE | null) => void;
  disabled?: boolean;
}

const MAX_CHARACTERS = 4;

// Normalize legacy DB style values to current style IDs
const LEGACY_STYLE_MAP: Record<string, string> = {
  "2d_anime": "anime",
  "2d_animated": "animated",
  "3d_animated": "pixar",
};

function normalizeStyle(dbStyle: string | null): string | null {
  if (!dbStyle) return null;
  return LEGACY_STYLE_MAP[dbStyle] || dbStyle;
}

export default function CharacterLocationPicker({
  storyCharacters,
  storyLocations,
  selectedStyle,
  selectedCharacters,
  selectedLocation,
  onCharactersChange,
  onLocationChange,
  disabled = false,
}: CharacterLocationPickerProps) {
  const [expandChars, setExpandChars] = useState(true);
  const [expandLocs, setExpandLocs] = useState(true);

  // Filter by matching visual style (accounting for legacy DB values)
  const filteredChars = storyCharacters.filter(
    (c) => normalizeStyle(c.visualStyle) === selectedStyle
  );
  const filteredLocs = storyLocations.filter(
    (l) => normalizeStyle(l.visualStyle) === selectedStyle
  );

  const selectedCharIds = new Set(selectedCharacters.map((c) => c.id));
  const hasProtagonist = selectedCharacters.some((c) => c.episodeRole === "protagonist");
  const hasAntagonist = selectedCharacters.some((c) => c.episodeRole === "antagonist");

  const addCharacter = (char: StoryCharacterFE) => {
    if (disabled || selectedCharacters.length >= MAX_CHARACTERS) return;
    if (selectedCharIds.has(char.id)) return;
    // Default role: protagonist if none yet, otherwise supporting
    const defaultRole: SelectedCharacter["episodeRole"] = !hasProtagonist
      ? "protagonist"
      : "supporting";
    onCharactersChange([...selectedCharacters, { ...char, episodeRole: defaultRole }]);
  };

  const removeCharacter = (charId: string) => {
    if (disabled) return;
    onCharactersChange(selectedCharacters.filter((c) => c.id !== charId));
  };

  const changeRole = (charId: string, newRole: SelectedCharacter["episodeRole"]) => {
    if (disabled) return;
    onCharactersChange(
      selectedCharacters.map((c) =>
        c.id === charId ? { ...c, episodeRole: newRole } : c
      )
    );
  };

  const toggleLocation = (loc: StoryLocationFE) => {
    if (disabled) return;
    if (selectedLocation?.id === loc.id) {
      onLocationChange(null);
    } else {
      onLocationChange(loc);
    }
  };

  const noCharsMatch = filteredChars.length === 0 && storyCharacters.length > 0;
  const noLocsMatch = filteredLocs.length === 0 && storyLocations.length > 0;
  const noLibraryData = storyCharacters.length === 0 && storyLocations.length === 0;

  if (noLibraryData) return null;

  return (
    <div className={`mb-6 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <h3 className="text-white text-sm font-medium mb-1">Cast & Setting</h3>
      <p className="text-[#ADADAD] text-xs mb-3">(optional) Pick from your story library</p>

      {/* Characters section */}
      <div className="mb-4">
        <button
          onClick={() => setExpandChars(!expandChars)}
          className="flex items-center gap-1.5 text-white/70 text-xs font-medium mb-2 hover:text-white transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform ${expandChars ? "rotate-90" : ""}`}
          >
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
          Characters ({filteredChars.length})
        </button>

        {expandChars && (
          <>
            {noCharsMatch ? (
              <p className="text-[#ADADAD] text-xs italic">
                No characters match the selected style
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {filteredChars.map((char) => {
                  const isSelected = selectedCharIds.has(char.id);
                  return (
                    <button
                      key={char.id}
                      onClick={() => !isSelected && addCharacter(char)}
                      disabled={isSelected || selectedCharacters.length >= MAX_CHARACTERS}
                      className={`flex-shrink-0 w-[90px] rounded-xl overflow-hidden border transition-all ${
                        isSelected
                          ? "border-[#B8B6FC] opacity-50 cursor-default"
                          : "border-[#262626] hover:border-[#444] cursor-pointer"
                      } ${
                        !isSelected && selectedCharacters.length >= MAX_CHARACTERS
                          ? "opacity-40 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <div className="w-[90px] h-[120px] bg-[#262626] relative">
                        {(char.imageUrl || char.imageBase64) ? (
                          <img
                            src={char.imageUrl || `data:${char.imageMimeType};base64,${char.imageBase64}`}
                            alt={char.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          </div>
                        )}
                        {!isSelected && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-[#B8B6FC] rounded-full flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="black">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-white text-[11px] px-1.5 py-1 truncate text-center">{char.name}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected characters with role dropdowns */}
            {selectedCharacters.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {selectedCharacters.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-2 bg-panel-border rounded-lg px-3 py-1.5"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-[#262626] flex-shrink-0">
                      {(char.imageUrl || char.imageBase64) ? (
                        <img
                          src={char.imageUrl || `data:${char.imageMimeType};base64,${char.imageBase64}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <span className="text-white text-xs font-medium flex-1 truncate">
                      {char.name}
                    </span>
                    <select
                      value={char.episodeRole}
                      onChange={(e) =>
                        changeRole(char.id, e.target.value as SelectedCharacter["episodeRole"])
                      }
                      className="bg-[#262626] text-[#ADADAD] text-[10px] rounded px-1.5 py-1 border-none outline-none cursor-pointer"
                    >
                      <option value="protagonist" disabled={hasProtagonist && char.episodeRole !== "protagonist"}>
                        Protagonist
                      </option>
                      <option value="antagonist" disabled={hasAntagonist && char.episodeRole !== "antagonist"}>
                        Antagonist
                      </option>
                      <option value="supporting">Supporting</option>
                    </select>
                    <button
                      onClick={() => removeCharacter(char.id)}
                      className="text-[#ADADAD] hover:text-red-400 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Location section */}
      <div>
        <button
          onClick={() => setExpandLocs(!expandLocs)}
          className="flex items-center gap-1.5 text-white/70 text-xs font-medium mb-2 hover:text-white transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform ${expandLocs ? "rotate-90" : ""}`}
          >
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
          Location ({filteredLocs.length})
        </button>

        {expandLocs && (
          <>
            {noLocsMatch ? (
              <p className="text-[#ADADAD] text-xs italic">
                No locations match the selected style
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {filteredLocs.map((loc) => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => toggleLocation(loc)}
                      className={`flex-shrink-0 w-[90px] rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        isSelected
                          ? "border-green-500 ring-1 ring-green-500/30"
                          : "border-[#262626] hover:border-[#444]"
                      }`}
                    >
                      <div className="w-[90px] h-[60px] bg-[#262626] relative">
                        {(loc.imageUrl || loc.imageBase64) ? (
                          <img
                            src={loc.imageUrl || `data:${loc.imageMimeType};base64,${loc.imageBase64}`}
                            alt={loc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-white text-[11px] px-1.5 py-1 truncate text-center">{loc.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
