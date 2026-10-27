import React, { useEffect, useState } from "react";
import { Database, Flame, Archive, Trash2, RefreshCw, Layers, BarChart2 } from "lucide-react";
import { fetchSystemHealth, triggerRetentionSweep, type SystemHealthResponse } from "../../api/client";
import { useToast } from "../Toast";

export const QueueHealth: React.FC = () => {
    const [health, setHealth] = useState<SystemHealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [sweeping, setSweeping] = useState(false);
    const { showToast } = useToast();

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchSystemHealth();
            setHealth(data);
        } catch (err) {
            console.error("Failed to load health metrics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleManualSweep = async () => {
        setSweeping(true);
        try {
            const res = await triggerRetentionSweep();
            showToast(`Retention Sweep Complete: ${res.result.warmStrippedCount} stripped, ${res.result.coldDeletedAttempts} deleted`);
            loadData();
        } catch (err) {
            showToast("Failed to run retention sweep");
        } finally {
            setSweeping(false);
        }
    };

    // Prepare 24-hour chart bars
    const hourlyData = health?.hourlySpikes || [];
    const maxCount = Math.max(...hourlyData.map((d: any) => d.count), 5);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4" style={{ borderColor: "var(--border)" }}>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                        Queue Health & Storage Retention
                    </h1>
                    <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Real-time queue monitoring, 24-hour failure spikes, and 3-Tier lifecycle hygiene
                    </p>
                </div>

                <button
                    onClick={handleManualSweep}
                    disabled={sweeping}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition shadow-sm self-start sm:self-auto"
                    style={{
                        borderColor: "rgba(127, 75, 245, 0.3)",
                        backgroundColor: "rgba(127, 75, 245, 0.1)",
                        color: "var(--accent)",
                    }}
                >
                    <Database className={`w-3.5 h-3.5 ${sweeping ? "animate-spin" : ""}`} />
                    <span>{sweeping ? "Sweeping Storage..." : "Run Retention Sweep"}</span>
                </button>
            </div>

            {/* REAL SENTRY 24-HOUR FAILURE SPIKES GRAPH */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                            <BarChart2 className="w-4 h-4 text-purple-400" />
                            <span>Failure Spikes (Last 24 Hours)</span>
                        </h3>
                        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                            Real-time hourly failure histogram from PostgreSQL
                        </p>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: "var(--accent)" }}>
                        Peak: {maxCount} failures/hr
                    </span>
                </div>

                {/* Real Interactive Histogram Bars */}
                <div
                    className="h-36 w-full border rounded-xl flex items-end justify-between p-4 gap-2 overflow-x-auto"
                    style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface-hover)", // Clean theme surface!
                    }}
                >
                    {hourlyData.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-xs font-mono text-center" style={{ color: "var(--text-muted)" }}>
                            <span>No failure spikes detected in the last 24 hours.</span>
                            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>All background queues are operating within normal thresholds.</span>
                        </div>
                    ) : (
                        hourlyData.map((d: any, idx: number) => {
                            const heightPercent = Math.max(12, (d.count / maxCount) * 100);
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative min-w-[28px]">
                                    {/* Tooltip on hover */}
                                    <div
                                        className="opacity-0 group-hover:opacity-100 transition absolute -top-8 px-2 py-0.5 rounded text-[10px] font-mono shadow-md whitespace-nowrap z-20 pointer-events-none"
                                        style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text)", border: "1px solid var(--border)" }}
                                    >
                                        {d.count} failures at {d.hour}
                                    </div>

                                    {/* The Histogram Bar */}
                                    <div
                                        className="w-full rounded-t transition-all group-hover:brightness-110"
                                        style={{
                                            height: `${heightPercent}%`,
                                            backgroundColor: "var(--accent)",
                                            opacity: 0.85,
                                        }}
                                    />
                                    <span className="text-[10px] font-mono truncate w-full text-center" style={{ color: "var(--text-faint)" }}>
                                        {d.hour}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 3-Tier Storage Lifecycle Cards */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                    PostgreSQL 3-Tier Storage Lifecycle
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Hot Tier */}
                    <div className="glass-panel rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-rose-400 font-sans">
                                <Flame className="w-4 h-4 text-rose-500" />
                                <span>Hot Tier (Day 0–7)</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold">
                                Full Forensics
                            </span>
                        </div>
                        <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: "var(--text)" }}>
                            {health?.storageTiers.hotTierCount ?? 0}
                        </div>
                        <p className="text-[11px] font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            Full payload, stack traces, and 50 in-memory breadcrumbs preserved untouched.
                        </p>
                    </div>

                    {/* Warm Tier */}
                    <div className="glass-panel rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-amber-400 font-sans">
                                <Archive className="w-4 h-4 text-amber-500" />
                                <span>Warm Tier (Day 8–30)</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400 font-bold">
                                Lightweight
                            </span>
                        </div>
                        <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: "var(--text)" }}>
                            {health?.storageTiers.warmTierCount ?? 0}
                        </div>
                        <p className="text-[11px] font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            Heavy JSON stripped (payload & breadcrumbs = NULL). Error metadata preserved.
                        </p>
                    </div>

                    {/* Cold Tier */}
                    <div className="glass-panel rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5 font-sans" style={{ color: "var(--text-muted)" }}>
                                <Trash2 className="w-4 h-4" />
                                <span>Cold Tier (Day 30+)</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border)] font-bold" style={{ color: "var(--text-muted)" }}>
                                Purged
                            </span>
                        </div>
                        <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: "var(--text)" }}>
                            Auto-Purged
                        </div>
                        <p className="text-[11px] font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            Deleted in non-blocking batches of 500 rows with SKIP LOCKED.
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Queues Table */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                        Monitored Background Queues ({health?.totalQueues ?? 0})
                    </h3>
                    <button onClick={loadData} className="text-xs font-mono flex items-center gap-1 hover:underline" style={{ color: "var(--text-muted)" }}>
                        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs font-mono">
                        <thead>
                            <tr className="border-b text-[11px] uppercase tracking-wider" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-hover)", color: "var(--text-faint)" }}>
                                <th className="py-2.5 px-4 font-semibold">Queue Name</th>
                                <th className="py-2.5 px-4 font-semibold">Failed Incidents</th>
                                <th className="py-2.5 px-4 font-semibold">Queue Status</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Health Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                            {health?.queues.map((q) => (
                                <tr key={q.name} className="hover:bg-[var(--surface-hover)] transition">
                                    <td className="py-3 px-4 font-bold text-cyan-400 flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>{q.name}</span>
                                    </td>
                                    <td className="py-3 px-4" style={{ color: "var(--text)" }}>
                                        {q.failedJobsCount} recorded
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/20 bg-rose-500/10 text-rose-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            Degraded (Errors Detected)
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-emerald-500">
                                        Active
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
