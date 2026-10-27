import React from "react";
import { ListFilter, FileSearch, Activity } from "lucide-react";

export type PageId = "feed" | "detail" | "health";

type NavigationProps = {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
};

export const Navigation: React.FC<NavigationProps> = ({ activePage, onNavigate }) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Issues Stream", icon: <ListFilter className="w-5 h-5" /> },
    { id: "detail", label: "Issue Details", icon: <FileSearch className="w-5 h-5" /> },
    { id: "health", label: "Queue Health & Storage", icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <aside
      className="w-full md:w-16 border-b md:border-b-0 md:border-r flex md:flex-col items-center justify-between p-3 shrink-0 select-none z-40"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="flex md:flex-col items-center gap-3">
        {/* Brand Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shadow-sm text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          ⚡
        </div>

        {/* Navigation Items */}
        <nav className="flex md:flex-col items-center gap-1.5 ml-4 md:ml-0">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={item.label}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition"
                style={{
                  backgroundColor: isActive ? "rgba(127, 75, 245, 0.15)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  border: isActive ? "1px solid rgba(127, 75, 245, 0.3)" : "1px solid transparent",
                }}
              >
                {item.icon}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Initials */}
      <div className="hidden md:flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          JS
        </div>
      </div>
    </aside>
  );
};
