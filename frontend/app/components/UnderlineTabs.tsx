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
  variant?: "underline" | "pill";
}

export default function UnderlineTabs({
  tabs,
  activeTab,
  onTabChange,
  className = "",
  variant = "underline",
}: UnderlineTabsProps) {
  return (
    <div className={`flex items-center ${variant === "pill" ? "gap-6" : "gap-0"} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === "pill") {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative px-4 py-2"
            >
              {/* Pill border for active state */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg border border-[#3A3A3C]" />
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
                <div className="absolute bottom-1 left-4 right-4 h-[2px] bg-white rounded-full" />
              )}
            </button>
          );
        }

        // Default underline variant
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`h-[41px] px-[15px] py-2 rounded-lg ${
              isActive ? "border-b-2 border-white" : ""
            }`}
          >
            <span
              className={`text-base uppercase ${
                isActive
                  ? "text-white font-bold"
                  : "text-[#BEC0C9] font-normal hover:text-white"
              }`}
              style={{ fontFamily: "Mulish" }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
