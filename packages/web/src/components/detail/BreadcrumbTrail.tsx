import React, { useState } from "react";
import type { Breadcrumb } from "../../api/types";
import { ChevronDown, ChevronRight, Globe, Layers } from "lucide-react";

export const BreadcrumbTrail: React.FC<{
    breadcrumbs?: Breadcrumb[];
    droppedCount?: number | null;
}> = ({ breadcrumbs = [], droppedCount = 0 }) => {
    const [filter, setFilter] = useState<string>("all");
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (breadcrumbs.length === 0) {
        return (
            <div className="glass-panel p-6 rounded-xl text-xs font-mono text-center" style={{ color: "var(--text-muted)" }}>
                No breadcrumb timeline recorded for this attempt.
            </div>
        );
    }

    const filtered = breadcrumbs.filter((b) => {
        if (filter === "http") return b.category === "http";
        if (filter === "checkpoints") return b.category === "checkpoint";
        return true;
    });

    return (
        <div className="space-y-3">
            {/* Timeline Sub-header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                        Execution Timeline
                    </h3>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {breadcrumbs.length} events recorded {droppedCount ? `• ${droppedCount} dropped by ring buffer` : ""}
                    </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-[11px] font-mono border rounded-lg p-0.5 self-start sm:self-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                    <button
                        onClick={() => setFilter("all")}
                        className="px-2 py-0.5 rounded transition"
                        style={{
                            backgroundColor: filter === "all" ? "var(--surface-hover)" : "transparent",
                            color: filter === "all" ? "var(--text)" : "var(--text-muted)",
                            fontWeight: filter === "all" ? 600 : 400,
                        }}
                    >
                        All ({breadcrumbs.length})
                    </button>
                    <button
                        onClick={() => setFilter("http")}
                        className="px-2 py-0.5 rounded transition"
                        style={{
                            backgroundColor: filter === "http" ? "var(--surface-hover)" : "transparent",
                            color: filter === "http" ? "var(--text)" : "var(--text-muted)",
                            fontWeight: filter === "http" ? 600 : 400,
                        }}
                    >
                        HTTP
                    </button>
                    <button
                        onClick={() => setFilter("checkpoints")}
                        className="px-2 py-0.5 rounded transition"
                        style={{
                            backgroundColor: filter === "checkpoints" ? "var(--surface-hover)" : "transparent",
                            color: filter === "checkpoints" ? "var(--text)" : "var(--text-muted)",
                            fontWeight: filter === "checkpoints" ? 600 : 400,
                        }}
                    >
                        Steps
                    </button>
                </div>
            </div>

            {/* Bounded, Scrollable Trace Container */}
            <div
                className="glass-panel rounded-xl divide-y overflow-hidden text-xs font-mono max-h-[460px] overflow-y-auto"
                style={{ borderColor: "var(--border)" }}
            >
                {filtered.map((b, index) => {
                    const isHttp = b.category === "http";
                    const isFatal = isHttp && (b.message.includes("[FAILED]") || (b.data?.statusCode && Number(b.data.statusCode) >= 400));
                    const statusCode = b.data?.statusCode;
                    const hasMetadata = b.data && Object.keys(b.data).length > 0;
                    const isExpanded = expandedIndex === index;

                    return (
                        <div
                            key={index}
                            onClick={() => hasMetadata && setExpandedIndex(isExpanded ? null : index)}
                            className={`p-3 transition ${hasMetadata ? "cursor-pointer" : ""}`}
                            style={{
                                borderLeft: isFatal ? "4px solid #f43f5e" : "4px solid transparent",
                                backgroundColor: isFatal ? "rgba(244, 63, 94, 0.06)" : isExpanded ? "var(--surface-hover)" : "transparent",
                            }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Category Badge with NO OVERFLOW */}
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold border shrink-0"
                                        style={{
                                            backgroundColor: isFatal
                                                ? "var(--badge-red-bg)"
                                                : isHttp
                                                    ? "rgba(6, 182, 212, 0.1)"
                                                    : "var(--surface-elevated)",
                                            color: isFatal
                                                ? "var(--badge-red-text)"
                                                : isHttp
                                                    ? "#06b6d4"
                                                    : "var(--text-muted)",
                                            borderColor: isFatal
                                                ? "var(--badge-red-border)"
                                                : isHttp
                                                    ? "rgba(6, 182, 212, 0.3)"
                                                    : "var(--border)",
                                        }}
                                    >
                                        {isHttp ? <Globe className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                                        <span>{statusCode ? `HTTP ${statusCode}` : isHttp ? "HTTP" : "STEP"}</span>
                                    </div>

                                    {/* Message (Clean Spacing, No Collision) */}
                                    <span
                                        className={`truncate ${isFatal ? "font-bold text-rose-400" : ""}`}
                                        style={{ color: isFatal ? undefined : "var(--text)" }}
                                    >
                                        {b.message}
                                    </span>
                                </div>

                                {/* Right side: Duration or Timestamp */}
                                <div className="flex items-center gap-2 shrink-0 text-right">
                                    {b.data?.durationMs != null ? (
                                        <span
                                            className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                                            style={{
                                                backgroundColor: isFatal ? "rgba(244, 63, 94, 0.15)" : "var(--surface-hover)",
                                                borderColor: isFatal ? "rgba(244, 63, 94, 0.3)" : "var(--border)",
                                                color: isFatal ? "#f43f5e" : "var(--text-faint)",
                                            }}
                                        >
                                            {Number(b.data.durationMs)} ms
                                        </span>
                                    ) : (
                                        <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                                            {new Date(b.timestamp).toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" })}
                                        </span>
                                    )}

                                    {hasMetadata && (
                                        <span style={{ color: "var(--text-faint)" }}>
                                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Collapsible Metadata Drawer */}
                            {isExpanded && hasMetadata && (
                                <div
                                    className="mt-2.5 p-3 rounded-lg border text-[11px] leading-relaxed overflow-x-auto"
                                    style={{
                                        backgroundColor: "var(--surface-hover)", // Clean theme surface (no dark mud!)
                                        borderColor: "var(--border)",
                                    }}
                                >
                                    <pre style={{ color: "var(--text-muted)" }}>{JSON.stringify(b.data, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
