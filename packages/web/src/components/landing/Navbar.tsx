import React, { useState } from "react";
import { ArrowRight, ChevronDown, Sun, Moon, Sparkles, GitBranch } from "lucide-react";
import { useTheme } from "../../themes";

type NavbarProps = {
    onOpenConsole: () => void;
    onOpenDocs: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({ onOpenConsole, onOpenDocs }) => {
    const { currentTheme, setTheme } = useTheme();
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const toggleTheme = () => {
        if (currentTheme === "dark") setTheme("warm");
        else if (currentTheme === "warm") setTheme("light");
        else setTheme("dark");
    };

    return (
        <header className="fixed top-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
            <nav
                className="pointer-events-auto flex items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6 py-2.5 rounded-full border shadow-2xl transition-all duration-300 backdrop-blur-2xl"
                style={{
                    backgroundColor: "var(--glass-bg)",
                    borderColor: "var(--glass-border)",
                    boxShadow: "0 20px 40px -15px rgba(0,0,0,0.25)",
                }}
            >
                {/* Brand Logo */}
                <div
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="flex items-center gap-2 cursor-pointer select-none group"
                >
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm transition group-hover:scale-105"
                        style={{ backgroundColor: "var(--accent)" }}
                    >
                        ⚡
                    </div>
                    <span className="font-bold text-sm tracking-tight font-sans" style={{ color: "var(--text)" }}>
                        Job<span className="font-editorial text-base ml-0.5" style={{ color: "var(--accent)" }}>Inspector</span>
                    </span>
                </div>

                {/* Center Nav Links with Dropdowns */}
                <div className="hidden md:flex items-center gap-1 text-xs font-mono">
                    {/* Features Dropdown with High-Contrast Solid Surface */}
                    <div
                        className="relative"
                        onMouseEnter={() => setActiveDropdown("features")}
                        onMouseLeave={() => setActiveDropdown(null)}
                    >
                        <button
                            onClick={() => setActiveDropdown(activeDropdown === "features" ? null : "features")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full transition hover:bg-[var(--surface-hover)]"
                            style={{ color: "var(--text)" }}
                        >
                            <span className="font-medium">Features</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activeDropdown === "features" ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu (With zero-gap bridge so hover never breaks!) */}
                        {activeDropdown === "features" && (
                            <div className="absolute top-full left-0 pt-2 w-72 z-50">
                                <div
                                    className="p-3 rounded-2xl border shadow-2xl space-y-1.5 text-left font-sans glass-panel"
                                    style={{
                                        backgroundColor: "var(--surface)",
                                        borderColor: "var(--border)",
                                    }}
                                >
                                    <div
                                        onClick={() => {
                                            document.getElementById("the-problem")?.scrollIntoView({ behavior: "smooth" });
                                            setActiveDropdown(null);
                                        }}
                                        className="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition cursor-pointer"
                                    >
                                        <div className="font-bold text-xs text-purple-400">In-Memory Ring Buffer</div>
                                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Zero network calls on successful jobs</div>
                                    </div>

                                    <div
                                        onClick={() => {
                                            document.getElementById("interactive-demo")?.scrollIntoView({ behavior: "smooth" });
                                            setActiveDropdown(null);
                                        }}
                                        className="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition cursor-pointer"
                                    >
                                        <div className="font-bold text-xs text-cyan-400">Execution Diff Engine</div>
                                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Compare Attempt 1 vs Attempt 2 side-by-side</div>
                                    </div>

                                    <div
                                        onClick={() => {
                                            document.getElementById("the-problem")?.scrollIntoView({ behavior: "smooth" });
                                            setActiveDropdown(null);
                                        }}
                                        className="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition cursor-pointer"
                                    >
                                        <div className="font-bold text-xs text-rose-400">Queue Blast Radius</div>
                                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Separate poison pills from shared outages</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            const el = document.getElementById("the-problem");
                            el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-3 py-1.5 rounded-full transition hover:bg-[var(--surface-hover)] font-medium"
                        style={{ color: "var(--text)" }}
                    >
                        The Problem
                    </button>

                    <button
                        onClick={() => {
                            const el = document.getElementById("comparison-section");
                            el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-3 py-1.5 rounded-full transition hover:bg-[var(--surface-hover)] font-medium"
                        style={{ color: "var(--text)" }}
                    >
                        Why JobInspector?
                    </button>

                    <button
                        onClick={onOpenDocs}
                        className="px-3 py-1.5 rounded-full transition hover:bg-[var(--surface-hover)] font-medium"
                        style={{ color: "var(--text)" }}
                    >
                        Documentation
                    </button>
                </div>

                {/* Right Controls: Animated Theme Toggle + GitBranch + Launch CTA */}
                <div className="flex items-center gap-2">
                    {/* Animated Sun / Moon Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        title={`Switch Theme (Current: ${currentTheme})`}
                        className="p-2 rounded-full border transition hover:scale-105 active:scale-95"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
                    >
                        {currentTheme === "dark" ? (
                            <Moon className="w-3.5 h-3.5 text-purple-400" />
                        ) : currentTheme === "warm" ? (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                        )}
                    </button>

                    {/* GitBranch Star Button */}
                    <a
                        href="https://github.com/byte-curious/JobFailure_Inspector"
                        target="_blank"
                        rel="noreferrer"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition hover:bg-[var(--surface-hover)]"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
                    >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Star</span>
                    </a>

                    {/* Primary CTA Button */}
                    <button
                        onClick={onOpenConsole}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95 shrink-0"
                        style={{ backgroundColor: "var(--accent)" }}
                    >
                        <span>Live Console</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </nav>
        </header>
    );
};
