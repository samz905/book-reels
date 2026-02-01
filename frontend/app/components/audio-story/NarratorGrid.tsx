"use client";

import { Narrator } from "../../data/mockAudioStoryData";
import NarratorAvatar from "./NarratorAvatar";

interface NarratorGridProps {
  narrators: Narrator[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function NarratorGrid({
  narrators,
  selectedId,
  onSelect,
}: NarratorGridProps) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-9 gap-4">
      {narrators.map((narrator) => (
        <NarratorAvatar
          key={narrator.id}
          narrator={narrator}
          isSelected={selectedId === narrator.id}
          onSelect={() => onSelect(narrator.id)}
        />
      ))}
    </div>
  );
}
