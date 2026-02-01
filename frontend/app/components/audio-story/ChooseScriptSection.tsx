"use client";

import { Script } from "../../data/mockAudioStoryData";
import ScriptOptionCard from "./ScriptOptionCard";

interface ChooseScriptSectionProps {
  scripts: Script[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export default function ChooseScriptSection({
  scripts,
  selectedIndex,
  onSelect,
}: ChooseScriptSectionProps) {
  return (
    <div className="bg-[#0F0E13] rounded-xl p-6 border border-[#1A1E2F]">
      <h2 className="text-white text-lg font-bold mb-4">2. Choose a Script</h2>

      {scripts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/50 text-sm">
            You don&apos;t have any scripts yet, please generate scripts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scripts.map((script, index) => (
            <ScriptOptionCard
              key={script.id}
              script={script}
              isSelected={selectedIndex === index}
              onSelect={() => onSelect(index)}
              optionNumber={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
