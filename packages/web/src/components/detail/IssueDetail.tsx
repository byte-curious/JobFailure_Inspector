import React, { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, EyeOff, RotateCcw, Copy, Terminal, ShieldAlert } from "lucide-react";
import { fetchJobDetail } from "../../api/client";
import type { JobDetailResponse } from "../../api/types";
import { DiffCard } from "./DiffCard";
import { BreadcrumbTrail } from "./BreadcrumbTrail.tsx";
import { useToast } from "../Toast";

type IssueDetailProps = {
    jobId: string;
    onBack: () => void;
};

export const IssueDetail: React.FC<IssueDetailProps> = ({ jobId, onBack }) => {
    const [data, setData] = useState<JobDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(0);

    const { showToast } = useToast();

    useEffect(() => {
        setLoading(true);
        fetchJobDetail(jobId)
            .then((res) => {
                setData(res);
                // Default to latest attempt
                setSelectedAttemptIndex(res.attempts.length - 1);
            })
            .catch((err) => console.error("Error fetching job detail:", err))
            .finally(() => setLoading(false));
    }, [jobId]);

    const copyReplayCommand = () => {
        const cmd = `npx job-inspector inspect ${jobId}`;
        navigator.clipboard.writeText(cmd);
        showToast(`Copied to clipboard: ${cmd}`);
    };

    const copyPayload = () => {
        const payload = currentAttempt?.payload;
        if (!payload) return;
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        showToast("Payload JSON copied to clipboard");
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                Loading forensic autopsy...
            </div>
        );
    }

    if (!data || !data.job) {
        return (
            <div className="p-12 text-center space-y-4">
                <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>Job not found</p>
                <button onClick={onBack} className="px-3 py-1.5 rounded-lg border text-xs font-mono">
                    ← Back to Issues Stream
                </button>
            </div>
        );
    }

    const { job, attempts, diff, classification } = data;
    const currentAttempt = attempts[selectedAttemptIndex] || attempts[attempts.length - 1];

    return (
        <div className="space-y-6">
            {/* Top Breadcrumb Navigation */}
            <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-mono transition hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Issues Stream</span>
            </button>

            {/* Sentry-Style Incident Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between border-b pb-5 gap-4" style={{ borderColor: "var(--border)" }}>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        <span>Queue: <strong className="text-cyan-400 font-semibold">{job.queueName}</strong></span>
                        <span>•</span>
                        <span>Job ID: <strong>{job.externalJobId}</strong></span>
                        <span>•</span>
                        <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold border"
                            style={{
                                backgroundColor: "var(--badge-red-bg)",
                                color: "var(--badge-red-text)",
                                borderColor: "var(--badge-red-border)",
                            }}
                        >
                            {job.status}
                        </span>
                    </div>

                    {/* Clean, Non-Glitching Title */}
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-mono text-rose-400">
                        {currentAttempt?.errorName || "Fatal Error"}
                    </h1>
                    <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {currentAttempt?.errorMessage || "No error message captured"}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => showToast("Job Marked as Resolved")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition"
                        style={{ backgroundColor: "var(--accent)" }}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                    </button>
                    <button
                        onClick={() => showToast("Job Ignored / Muted")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition hover:opacity-80"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
                    >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ignore</span>
                    </button>
                    <button
                        onClick={() => showToast(`Job ${job.externalJobId} re-enqueued to Redis`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition hover:opacity-80"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-enqueue</span>
                    </button>
                    <button
                        onClick={copyReplayCommand}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition hover:opacity-80"
                        style={{ borderColor: "rgba(127, 75, 245, 0.3)", backgroundColor: "rgba(127, 75, 245, 0.1)", color: "var(--accent)" }}
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Copy Replay CLI</span>
                    </button>
                </div>
            </div>

            {/* Main Two-Column Layout (70% Left / 30% Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

                {/* Left Column: 70% Forensic Trace */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Attempt Selector Tabs */}
                    <div className="flex items-center justify-between border-b pb-2 text-xs" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[11px] font-mono mr-1" style={{ color: "var(--text-faint)" }}>ATTEMPTS:</span>
                            {attempts.map((att, idx) => {
                                const isSelected = idx === selectedAttemptIndex;
                                const isLatest = idx === attempts.length - 1;
                                return (
                                    <button
                                        key={att.id}
                                        onClick={() => setSelectedAttemptIndex(idx)}
                                        className="px-2.5 py-1 rounded-md font-mono text-xs transition"
                                        style={{
                                            backgroundColor: isSelected ? "var(--accent)" : "var(--surface)",
                                            color: isSelected ? "#ffffff" : "var(--text-muted)",
                                            border: isSelected ? "1px solid transparent" : "1px solid var(--border)",
                                        }}
                                    >
                                        Attempt {att.attemptNumber} {isLatest ? "(Latest)" : ""}
                                    </button>
                                );
                            })}
                        </div>
                        <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>
                            {new Date(currentAttempt?.failedAt || "").toLocaleString()}
                        </span>
                    </div>

                    {/* Execution Diff Card (Only shown on Attempt 2+) */}
                    {selectedAttemptIndex > 0 && <DiffCard diff={diff} />}

                    {/* Highlights Box (Key-Value Grid) */}
                    <div className="glass-panel rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                            Highlights
                        </h3>
                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs font-mono">
                            <div className="flex justify-between border-b pb-1.5" style={{ borderColor: "var(--border-subtle)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Execution Level:</span>
                                <span className="font-bold text-rose-400">Fatal Crash</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5" style={{ borderColor: "var(--border-subtle)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Execution Duration:</span>
                                <span>{currentAttempt?.duration ? `${currentAttempt.duration} ms` : "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5" style={{ borderColor: "var(--border-subtle)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Queue:</span>
                                <span className="text-cyan-400">{job.queueName}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5" style={{ borderColor: "var(--border-subtle)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Total Retries Made:</span>
                                <span>{job.totalAttempts}</span>
                            </div>
                        </div>
                    </div>
                    {/* Stack Trace Box (Fixed Theme Contrast & No Gray Slab!) */}
                    {currentAttempt?.errorStack && (
                        <div className="glass-panel rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                                    Stack Trace <span className="normal-case opacity-70">(Line numbers & call frames)</span>
                                </h3>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(currentAttempt.errorStack || "");
                                        showToast("Stack trace copied to clipboard");
                                    }}
                                    className="flex items-center gap-1 text-xs font-mono text-purple-400 hover:underline"
                                >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Stack</span>
                                </button>
                            </div>
                            <pre
                                className="p-3.5 rounded-lg border font-mono text-xs leading-relaxed overflow-x-auto"
                                style={{
                                    backgroundColor: "var(--surface-hover)", // Clean theme surface (no dark mud!)
                                    borderColor: "var(--border)",
                                    color: "var(--badge-red-text)", // Deep crimson in Light/Warm, Soft rose in Dark!
                                }}
                            >
                                {currentAttempt.errorStack}
                            </pre>
                        </div>
                    )}
                    {/* Breadcrumb Trail */}
                    <BreadcrumbTrail
                        breadcrumbs={currentAttempt?.breadcrumbs as any}
                        droppedCount={currentAttempt?.droppedBreadcrumbs}
                    />

                    {/* Sanitized Payload (Fixed Background) */}
                    <div className="glass-panel rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                                Sanitized Payload <span className="normal-case opacity-70">(Client-side scrubbed)</span>
                            </h3>
                            <button onClick={copyPayload} className="flex items-center gap-1 text-xs font-mono text-purple-400 hover:underline">
                                <Copy className="w-3 h-3" />
                                <span>Copy JSON</span>
                            </button>
                        </div>
                        <pre
                            className="p-3.5 rounded-lg border font-mono text-xs leading-relaxed overflow-x-auto"
                            style={{
                                backgroundColor: "var(--surface-hover)", // Clean theme surface!
                                borderColor: "var(--border)",
                                color: "var(--text)",
                            }}
                        >
                            {JSON.stringify(currentAttempt?.payload, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Right Column: 30% Context & Metadata Rail */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Incident Analysis Card (Blast Radius) */}
                    {classification && (
                        <div className="glass-panel rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                                    Incident Analysis
                                </span>
                                <ShieldAlert className="w-4 h-4 text-rose-400" />
                            </div>

                            <div className="space-y-2.5 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span style={{ color: "var(--text-muted)" }}>Category:</span>
                                    <strong className="font-bold text-rose-400">{classification.category}</strong>
                                </div>
                                <div className="flex justify-between" title="How many different jobs failed from this exact error in the last 5 minutes">
                                    <span style={{ color: "var(--text-muted)" }}>Blast Radius:</span>
                                    <strong>{classification.evidence.distinctJobsInQueueCount} jobs in queue</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: "var(--text-muted)" }}>Threshold:</span>
                                    <span>&ge; {classification.evidence.threshold} jobs</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: "var(--text-muted)" }}>Time Window:</span>
                                    <span>Last 5 mins</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Environment Tags */}
                    <div className="glass-panel rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                            Environment Tags
                        </h3>
                        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                            <span className="px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                                queue: <strong style={{ color: "var(--text)" }}>{job.queueName}</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                                status: <strong style={{ color: "var(--text)" }}>{job.status}</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                                attempts: <strong style={{ color: "var(--text)" }}>{job.totalAttempts}</strong>
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
