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
    <div className={`flex items-end ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`h-[42px] px-3 pt-3 pb-0 rounded-lg ${
              isActive ? "border-b-2 border-white" : ""
            }`}
          >
            <span
              className={`text-base uppercase leading-5 ${
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
