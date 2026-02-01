"use client";

interface Tab {
  id: string;
  label: string;
}

interface UnderlineTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function UnderlineTabs({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: UnderlineTabsProps) {
  return (
    <div className={`flex items-center gap-6 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative pb-2"
          >
            {/* Pill border for active state */}
            {isActive && (
              <div className="absolute inset-0 -top-1 -bottom-1 -left-4 -right-4 rounded-lg border border-[#3A3A3C]" />
            )}
            <span
              className={`relative text-sm uppercase tracking-wide ${
                isActive
                  ? "text-white font-semibold"
                  : "text-[#8E8E93] font-medium hover:text-white"
              }`}
              style={{ fontFamily: "Mulish" }}
            >
              {tab.label}
            </span>
            {/* Underline for active state */}
            {isActive && (
              <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
