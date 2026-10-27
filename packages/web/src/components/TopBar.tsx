import React from "react";
import { useTheme } from "../themes";
import type { PageId } from "./Navigation";

type TopBarProps = {
    activePage: PageId;
    selectedJobId?: string | null;
    isConnected: boolean;
};

export const TopBar: React.FC<TopBarProps> = ({ activePage, selectedJobId, isConnected }) => {
    const { currentTheme, setTheme } = useTheme();

    const getPageTitle = () => {
        if (activePage === "feed") return "Issues Stream";
        if (activePage === "detail") return selectedJobId ? `Job #${selectedJobId}` : "Issue Details";
        return "Queue Health & Storage Retention";
    };

    return (
        <header
            className="border-b px-5 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>
                    Job<span className="font-editorial text-lg ml-0.5" style={{ color: "var(--accent)" }}>Inspector</span>
                </span>
                <span style={{ color: "var(--text-faint)" }}>/</span>
                <span style={{ color: "var(--text-muted)" }}>production</span>
                <span style={{ color: "var(--text-faint)" }}>/</span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
                    {getPageTitle()}
                </span>
            </div>

            {/* Controls: Live Status & Theme Switcher */}
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
            </div>
        </header>
    );
};
