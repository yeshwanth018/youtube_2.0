import React, { useState } from "react";
import { Button } from "./ui/button";

const tabs = [
  { id: "home", label: "Home" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "downloads", label: "Downloads" },
  { id: "playlists", label: "Playlists" },
  { id: "community", label: "Community" },
  { id: "about", label: "About" },
];

interface ChanneltabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Channeltabs = ({ activeTab: controlledTab, onTabChange }: ChanneltabsProps) => {
  const [internalTab, setInternalTab] = useState("videos");
  const activeTab = controlledTab ?? internalTab;

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalTab(tabId);
    }
  };

  return (
    <div className="border-b px-4">
      <div className="flex gap-8 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`px-0 py-4 border-b-2 rounded-none ${
              activeTab === tab.id ? "border-black text-black" : "border-transparent text-gray-600 hover:text-black"
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Channeltabs;
