import React from "react";
import { useTheme } from "../themes";
import type { PageId } from "./Navigation";
import { LogIn, LogOut, FolderGit2 } from "lucide-react";

type TopBarProps = {
  activePage: PageId;
  selectedJobId?: string | null;
  isConnected: boolean;
  user: any;
  activeProject: any;
  onOpenAuth: () => void;
  onLogout: () => void;
};

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  selectedJobId,
  isConnected,
  user,
  activeProject,
  onOpenAuth,
  onLogout,
}) => {
  const { currentTheme, setTheme } = useTheme();

  const getPageTitle = () => {
    if (activePage === "feed") return "Issues Stream";
    if (activePage === "detail") return selectedJobId ? `Job #${selectedJobId}` : "Issue Details";
    if (activePage === "health") return "Queue Health & Storage Retention";
    if (activePage === "settings") return "Settings & Live Architecture";
    return "Workspace";
  };

  return (
    <header
      className="border-b px-5 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Breadcrumb Path & Project Info */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>
          Job<span className="font-editorial text-lg ml-0.5" style={{ color: "var(--accent)" }}>Inspector</span>
        </span>
        <span style={{ color: "var(--text-faint)" }}>/</span>

        {/* Project Badge */}
        {activeProject ? (
          <span className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-hover)", color: "var(--text)" }}>
            <FolderGit2 className="w-3 h-3 text-cyan-400" />
            <span>{activeProject.name}</span>
          </span>
        ) : (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            Public Sandbox
          </span>
        )}

        <span style={{ color: "var(--text-faint)" }}>/</span>
        <span className="font-medium" style={{ color: "var(--text)" }}>
          {getPageTitle()}
        </span>
      </div>

      {/* Controls: Live Status, Theme Switcher & Auth */}
      <div className="flex items-center gap-3">
        {/* Real-Time SSE Indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono"
          style={{
            borderColor: isConnected ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
            backgroundColor: isConnected ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: isConnected ? "#10b981" : "#ef4444",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: isConnected ? "#10b981" : "#ef4444",
              animation: isConnected ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
            }}
          />
          <span>{isConnected ? "Live Stream" : "Connecting..."}</span>
        </div>

        {/* Theme Picker */}
        <div className="flex items-center border rounded-lg overflow-hidden text-xs font-mono" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setTheme("dark")}
            className="px-2.5 py-1 transition"
            style={{
              backgroundColor: currentTheme === "dark" ? "var(--accent)" : "transparent",
              color: currentTheme === "dark" ? "#ffffff" : "var(--text-muted)",
            }}
          >
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className="px-2.5 py-1 border-l transition"
            style={{
              backgroundColor: currentTheme === "light" ? "var(--accent)" : "transparent",
              color: currentTheme === "light" ? "#ffffff" : "var(--text-muted)",
              borderColor: "var(--border)",
            }}
          >
            Light
          </button>
          <button
            onClick={() => setTheme("warm")}
            className="px-2.5 py-1 border-l transition"
            style={{
              backgroundColor: currentTheme === "warm" ? "var(--accent)" : "transparent",
              color: currentTheme === "warm" ? "#ffffff" : "var(--text-muted)",
              borderColor: "var(--border)",
            }}
          >
            Warm
          </button>
        </div>

        {/* Auth Button: Login or Profile */}
        {user ? (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs font-mono font-medium hidden sm:inline" style={{ color: "var(--text-muted)" }}>
              {user.name || user.email}
            </span>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg border transition hover:opacity-80"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white shadow-sm transition"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
