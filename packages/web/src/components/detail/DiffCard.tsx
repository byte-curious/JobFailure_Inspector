import React from "react";
import type { ExecutionDiff } from "../../api/types";
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";

export const DiffCard: React.FC<{ diff: ExecutionDiff | null }> = ({ diff }) => {
    if (!diff) return null;

    if (!diff.hasBaseline) {
        return (
            <div className="glass-panel p-4 rounded-xl text-xs font-mono flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>First recorded execution for this job; no earlier baseline exists to compare.</span>
            </div>
        );
    }

    const { previousAttemptNumber, currentAttemptNumber, fingerprintChanged, previousErrorName, currentErrorName, durationDeltaMs, timeline } = diff;

    return (
        <div className="glass-panel rounded-xl overflow-hidden shadow-xs">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-hover)" }}>
                <div className="flex items-center gap-2 text-xs font-bold font-sans" style={{ color: "var(--text)" }}>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Execution Diff</span>
                    <span className="font-mono font-normal text-[11px]" style={{ color: "var(--text-muted)" }}>
                        (Attempt {previousAttemptNumber} <ArrowRight className="w-3 h-3 inline" /> Attempt {currentAttemptNumber})
                    </span>
                </div>

                {fingerprintChanged && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold border" style={{ backgroundColor: "var(--badge-red-bg)", color: "var(--badge-red-text)", borderColor: "var(--badge-red-border)" }}>
                        Root Cause Shifted
                    </span>
                )}
            </div>

            {/* Diff Details Grid */}
            <div className="p-4 space-y-2.5 text-xs font-mono">
                <div className="flex flex-col md:flex-row md:items-center justify-between py-1 border-b gap-1" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Error Shift:</span>
                    <span>
                        <span style={{ color: "var(--text-faint)" }}>{previousErrorName}</span>
                        <span className="mx-2" style={{ color: "var(--text-muted)" }}>➔</span>
                        <strong className="font-bold" style={{ color: fingerprintChanged ? "var(--badge-red-text)" : "var(--text)" }}>
                            {currentErrorName}
                        </strong>
                    </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between py-1 border-b gap-1" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Execution Timing:</span>
                    <span className="font-bold" style={{ color: durationDeltaMs && durationDeltaMs < 0 ? "#10b981" : "var(--text)" }}>
                        {durationDeltaMs != null
                            ? `${durationDeltaMs > 0 ? "+" : ""}${durationDeltaMs} ms ${durationDeltaMs < 0 ? "(crashed earlier along code path)" : ""}`
                            : "N/A"}
                    </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between py-1 gap-1">
                    <span style={{ color: "var(--text-muted)" }}>Timeline Comparison:</span>
                    <span>
                        {timeline?.outcome?.status === "IDENTICAL" && <span className="text-emerald-500 font-bold">IDENTICAL SEQUENCE</span>}
                        {timeline?.outcome?.status === "REORDERED" && <span className="text-amber-500 font-bold">REORDERED (Same tasks in different order)</span>}
                        {timeline?.outcome?.status === "DIVERGED" && (
                            <span>DIVERGED at <strong className="underline decoration-rose-500">Step {timeline.outcome.divergenceIndex}</strong></span>
                        )}
                        {timeline?.outcome?.status === "TAIL_DIVERGED" && (
                            <span>TAIL DIVERGED at <strong className="underline decoration-rose-500">{timeline.outcome.stepsFromEnd} step(s) from crash</strong></span>
                        )}
                        {timeline?.scope === "UNAVAILABLE" && <span style={{ color: "var(--text-faint)" }}>Breadcrumbs Unavailable ({timeline.reason})</span>}
                    </span>
                </div>
            </div>
        </div>
    );
};
