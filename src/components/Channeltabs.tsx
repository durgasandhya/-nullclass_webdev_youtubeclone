import React, { useState } from "react";
import { Button } from "./ui/button";
import { useTheme } from "@/lib/ThemeContext";

const tabs = [
  { id: "home", label: "Home" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "playlists", label: "Playlists" },
  { id: "community", label: "Community" },
  { id: "about", label: "About" },
];

const Channeltabs = () => {
  const [activeTab, setActiveTab] = useState("videos");
  const { theme } = useTheme();
  return (
    <div className={`border-b px-4 ${theme === "light" ? "border-gray-200" : "border-gray-700"}`}>
      <div className="flex gap-8 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`px-0 py-4 border-b-2 rounded-none ${
              activeTab === tab.id
                ? theme === "light"
                  ? "border-black text-black"
                  : "border-white text-white"
                : theme === "light"
                ? "border-transparent text-gray-600 hover:text-black"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Channeltabs;
