import React, { useState } from "react";
import {
  Search,
  ArrowRight,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowLeft,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { DOCS_SECTIONS  } from "./docsData";
import { useTheme } from "../../themes";
import { useToast } from "../Toast";

type DocsPortalProps = {
  onBackToLanding: () => void;
  onOpenConsole: () => void;
};

// Formats inline backticks `code` into styled chips
function formatInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="font-mono text-xs px-1.5 py-0.5 rounded border font-semibold mx-0.5"
          style={{
            backgroundColor: "var(--surface-hover)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const DocsPortal: React.FC<DocsPortalProps> = ({ onBackToLanding, onOpenConsole }) => {
  const [selectedDocId, setSelectedDocId] = useState<string>("quickstart");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { currentTheme, setTheme } = useTheme();
  const { showToast } = useToast();
  const isLightOrWarm = currentTheme === "light" || currentTheme === "warm";

  const toggleTheme = () => {
    if (currentTheme === "dark") setTheme("warm");
    else if (currentTheme === "warm") setTheme("light");
    else setTheme("dark");
  };

  const activeDoc = DOCS_SECTIONS.find((d) => d.id === selectedDocId) || DOCS_SECTIONS[0];

  const filteredSections = DOCS_SECTIONS.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q)
    );
  });

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    showToast("Code copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const categories = Array.from(new Set(DOCS_SECTIONS.map((d) => d.category)));

  return (
    <div
      className="min-h-screen flex flex-col w-full selection:bg-purple-500/30 selection:text-purple-200"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {/* Top Header */}
      <header
        className="border-b px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl"
        style={{ backgroundColor: "var(--glass-bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-mono transition hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </button>

          <div className="h-4 w-px border-l hidden sm:block" style={{ borderColor: "var(--border)" }} />

          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs text-white"
              style={{ backgroundColor: "var(--accent)" }}
            >
              ⚡
            </span>
            <span className="font-bold text-sm tracking-tight font-sans" style={{ color: "var(--text)" }}>
              Job<span className="font-editorial text-base ml-0.5" style={{ color: "var(--accent)" }}>Inspector</span>
            </span>
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded border"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", backgroundColor: "var(--surface)" }}
            >
              Docs
            </span>
          </div>
        </div>

        {/* Search Bar + Controls */}
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
            <input
              type="text"
              placeholder="Search guides, CLI, SDK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs font-mono pl-8 pr-3 py-1.5 rounded-lg border w-72 focus:outline-none focus:ring-1 focus:ring-purple-500"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </div>

          <button
            onClick={toggleTheme}
            title={`Switch Theme (Current: ${currentTheme})`}
            className="p-1.5 rounded-lg border transition hover:scale-105"
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

          <button
            onClick={onOpenConsole}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-white shadow-xs transition hover:opacity-90"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <span>Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main 3-Column Docs Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 md:px-8">
        
        {/* ===================================================================
            COLUMN 1: LEFT NAVIGATION SIDEBAR
            =================================================================== */}
        <aside
          className="w-64 border-r pr-6 py-8 hidden md:block shrink-0 space-y-6 sticky top-14 h-[calc(100vh-57px)] overflow-y-auto font-sans text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          {categories.map((cat) => {
            const docsInCat = filteredSections.filter((d) => d.category === cat);
            if (docsInCat.length === 0) return null;

            return (
              <div key={cat} className="space-y-1.5">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider pl-2" style={{ color: "var(--text-faint)" }}>
                  {cat}
                </h4>
                <div className="space-y-0.5">
                  {docsInCat.map((doc) => {
                    const isActive = doc.id === selectedDocId;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg transition flex items-center justify-between"
                        style={{
                          backgroundColor: isActive ? "var(--surface-hover)" : "transparent",
                          color: isActive ? "var(--accent)" : "var(--text-muted)",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        <span className="truncate">{doc.title.split("(")[0]}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-1" style={{ backgroundColor: "var(--accent)" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* ===================================================================
            COLUMN 2: CENTER PROSE READING CANVAS
            =================================================================== */}
        <main className="flex-1 py-8 md:px-10 max-w-3xl min-w-0 space-y-8">
          {/* Article Header (NO ESTIMATED TIMINGS!) */}
          <div className="space-y-2 border-b pb-6" style={{ borderColor: "var(--border)" }}>
            <div className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>
              <span>{activeDoc.category}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans" style={{ color: "var(--text)" }}>
              {activeDoc.title}
            </h1>
            <p className="text-sm md:text-base font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {activeDoc.description}
            </p>
          </div>

          {/* Callout Box */}
          {activeDoc.callout && (
            <div
              className="p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3"
              style={{
                backgroundColor:
                  activeDoc.callout.type === "warning"
                    ? isLightOrWarm ? "#fff1f2" : "rgba(244, 63, 94, 0.08)"
                    : activeDoc.callout.type === "tip"
                    ? isLightOrWarm ? "#f0fdf4" : "rgba(16, 185, 129, 0.08)"
                    : isLightOrWarm ? "#f5f3ff" : "rgba(127, 75, 245, 0.08)",
                borderColor:
                  activeDoc.callout.type === "warning"
                    ? isLightOrWarm ? "#fecdd3" : "rgba(244, 63, 94, 0.25)"
                    : activeDoc.callout.type === "tip"
                    ? isLightOrWarm ? "#bbf7d0" : "rgba(16, 185, 129, 0.25)"
                    : isLightOrWarm ? "#ddd6fe" : "rgba(127, 75, 245, 0.25)",
              }}
            >
              {activeDoc.callout.type === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : activeDoc.callout.type === "tip" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold font-sans text-xs" style={{ color: "var(--text)" }}>
                  {activeDoc.callout.title}
                </div>
                <div className="font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {formatInlineCode(activeDoc.callout.text)}
                </div>
              </div>
            </div>
          )}

          {/* STRUCTURED STEP-BY-STEP MILESTONES */}
          {activeDoc.steps && (
            <div className="space-y-10">
              {activeDoc.steps.map((step) => (
                <div key={step.id} id={step.id} className="space-y-3 scroll-mt-24">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0"
                      style={{
                        backgroundColor: isLightOrWarm ? "rgba(127, 75, 245, 0.12)" : "rgba(127, 75, 245, 0.2)",
                        color: "var(--accent)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {step.stepNumber}
                    </span>
                    <h3 className="text-lg font-bold font-sans" style={{ color: "var(--text)" }}>
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-sm font-sans leading-relaxed pl-10" style={{ color: "var(--text-muted)" }}>
                    {formatInlineCode(step.description)}
                  </p>

                  {/* Harmonious Code Block */}
                  {step.code && (
                    <div className="pl-10">
                      <div
                        className="rounded-2xl border overflow-hidden shadow-xs font-mono text-xs"
                        style={{
                          backgroundColor: isLightOrWarm ? "var(--surface-hover)" : "#130f1e",
                          borderColor: "var(--border)",
                        }}
                      >
                        <div
                          className="px-4 py-2 border-b flex items-center justify-between text-[11px]"
                          style={{
                            borderColor: "var(--border-subtle)",
                            backgroundColor: isLightOrWarm ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.25)",
                          }}
                        >
                          <span style={{ color: "var(--text-faint)" }}>{step.code.filename || "snippet"}</span>
                          <button
                            onClick={() => copyCode(step.code!.code, step.id)}
                            className="flex items-center gap-1.5 transition hover:opacity-80"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {copiedKey === step.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === step.id ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <pre
                          className="p-4 overflow-x-auto leading-relaxed text-xs"
                          style={{
                            color: isLightOrWarm ? "var(--text)" : "#7dd3fc",
                          }}
                        >
                          {step.code.code}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* DEEP DIVE SECTION */}
          {activeDoc.deepDive && (
            <div id={activeDoc.deepDive.id} className="space-y-4 border-t pt-8 scroll-mt-24" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>
                {activeDoc.deepDive.title}
              </h3>
              <div className="space-y-3 font-sans text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {activeDoc.deepDive.paragraphs.map((p, idx) => (
                  <p key={idx}>{formatInlineCode(p)}</p>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ===================================================================
            COLUMN 3: ON-PAGE TABLE OF CONTENTS (NOW FULLY CLICKABLE & WORKING!)
            =================================================================== */}
        <aside
          className="w-56 pl-8 py-8 hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-57px)] overflow-y-auto space-y-3 font-mono text-xs border-l"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
            On this page
          </div>
          <div className="space-y-2 text-xs">
            {activeDoc.steps.map((step) => (
              <div
                key={step.id}
                onClick={() => scrollToSection(step.id)}
                className="truncate hover:underline cursor-pointer transition select-none"
                style={{ color: "var(--text-muted)" }}
              >
                {step.stepNumber}. {step.title}
              </div>
            ))}
            {activeDoc.deepDive && (
              <div
                onClick={() => scrollToSection(activeDoc.deepDive!.id)}
                className="truncate hover:underline cursor-pointer pt-1 transition select-none"
                style={{ color: "var(--text-muted)" }}
              >
                {activeDoc.deepDive.title}
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
};
