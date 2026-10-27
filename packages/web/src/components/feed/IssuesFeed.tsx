import React, { useState, useEffect } from "react";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { fetchJobs } from "../../api/client";
import type { JobSummary } from "../../api/types";
import { BulkActionBar } from "./BulkActionBar";

type IssuesFeedProps = {
    onSelectJob: (jobId: string) => void;
};

export const IssuesFeed: React.FC<IssuesFeedProps> = ({ onSelectJob }) => {
    const [jobs, setJobs] = useState<JobSummary[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [availableQueues, setAvailableQueues] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters state
    const [selectedQueue, setSelectedQueue] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Checkbox selection state
    const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchJobs({
                queue: selectedQueue !== "all" ? selectedQueue : undefined,
                status: selectedStatus !== "all" ? selectedStatus : undefined,
                limit: 25,
            });
            setJobs(res.data);
            setTotalCount(res.pagination.totalCount);
            setAvailableQueues(res.availableQueues);
        } catch (err) {
            console.error("Failed to load jobs feed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedQueue, selectedStatus]);

    // Checkbox handlers with strict stopPropagation
    const handleToggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents clicking the row!
        setSelectedJobIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (selectedJobIds.size === filteredJobs.length) {
            setSelectedJobIds(new Set());
        } else {
            setSelectedJobIds(new Set(filteredJobs.map((j) => j.id)));
        }
    };

    // Client-side search filtering
    const filteredJobs = jobs.filter((job) => {
        const q = searchQuery.toLowerCase();
        const errorMsg = job.latestAttempt?.errorMessage?.toLowerCase() || "";
        const errorName = job.latestAttempt?.errorName?.toLowerCase() || "";
        const externalId = job.externalJobId.toLowerCase();
        const queue = job.queueName.toLowerCase();
        return (
            errorMsg.includes(q) ||
            errorName.includes(q) ||
            externalId.includes(q) ||
            queue.includes(q)
        );
    });

    return (
        <div className="space-y-4">
            {/* Feed Header with Balanced Typography */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-sans" style={{ color: "var(--text)" }}>
                        Issues <span className="font-editorial text-3xl font-normal ml-0.5" style={{ color: "var(--accent)" }}>Stream</span>
                    </h1>
                    <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Real-time background worker failures and dead-letter queues
                    </p>
                    <div className="text-[11px] font-mono mt-1" style={{ color: "var(--text-faint)" }}>
                        {totalCount > 0 ? `Showing ${jobs.length} of ${totalCount} issues` : "Loading issues..."}
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Box */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
                        <input
                            type="text"
                            placeholder="Filter by error, ID, queue..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-xs font-mono pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none w-56 md:w-64"
                            style={{
                                backgroundColor: "var(--surface)",
                                borderColor: "var(--border)",
                                color: "var(--text)",
                            }}
                        />
                    </div>

                    {/* Queue Filter */}
                    <select
                        value={selectedQueue}
                        onChange={(e) => setSelectedQueue(e.target.value)}
                        className="text-xs font-mono px-3 py-1.5 rounded-lg border focus:outline-none"
                        style={{
                            backgroundColor: "var(--surface)",
                            borderColor: "var(--border)",
                            color: "var(--text-muted)",
                        }}
                    >
                        <option value="all">All Queues</option>
                        {availableQueues.map((q) => (
                            <option key={q} value={q}>
                                {q}
                            </option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="text-xs font-mono px-3 py-1.5 rounded-lg border focus:outline-none"
                        style={{
                            backgroundColor: "var(--surface)",
                            borderColor: "var(--border)",
                            color: "var(--text-muted)",
                        }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="FAILED">FAILED</option>
                        <option value="DEAD_LETTER">DEAD LETTER</option>
                        <option value="RESOLVED">RESOLVED</option>
                    </select>

                    {/* Refresh Button */}
                    <button
                        onClick={loadData}
                        title="Refresh feed"
                        className="p-1.5 rounded-lg border transition hover:opacity-80"
                        style={{
                            backgroundColor: "var(--surface)",
                            borderColor: "var(--border)",
                            color: "var(--text-muted)",
                        }}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Main Feed Container */}
            <div className="glass-panel rounded-xl overflow-hidden shadow-xs">
                {/* Table Header (Desktop Only) */}
                <div
                    className="hidden md:grid grid-cols-12 border-b text-[11px] uppercase font-mono tracking-wider py-2.5 px-4 items-center"
                    style={{ borderColor: "var(--border)", color: "var(--text-faint)", backgroundColor: "var(--surface-hover)" }}
                >
                    <div className="col-span-1 flex items-center">
                        <input
                            type="checkbox"
                            checked={filteredJobs.length > 0 && selectedJobIds.size === filteredJobs.length}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded cursor-pointer"
                        />
                    </div>
                    <div className="col-span-5 font-semibold">Issue & Error Message</div>
                    <div className="col-span-2 font-semibold">Queue</div>
                    <div className="col-span-2 font-semibold">Status</div>
                    <div className="col-span-1 font-semibold">Attempts</div>
                    <div className="col-span-1 text-right font-semibold">Age</div>
                </div>

                {/* Rows */}
                {loading && jobs.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        Loading issues stream...
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                        <AlertCircle className="w-6 h-6 mx-auto opacity-40" />
                        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                            No matching issues found
                        </p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {filteredJobs.map((job) => {
                            const isSelected = selectedJobIds.has(job.id);
                            const isDeadLetter = job.status === "DEAD_LETTER";
                            const isFailed = job.status === "FAILED";

                            return (
                                <div
                                    key={job.id}
                                    onClick={() => onSelectJob(job.id)}
                                    className="p-4 md:py-3 md:px-4 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-0 items-center cursor-pointer transition select-none"
                                    style={{
                                        backgroundColor: isSelected ? "var(--surface-hover)" : "transparent",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                >
                                    {/* Checkbox (Larger 16px hit target with strict stopPropagation) */}
                                    <div
                                        className="hidden md:flex col-span-1 items-center w-8 h-8 cursor-pointer"
                                        onClick={(e) => handleToggleSelect(job.id, e)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => { }} // Controlled by container onClick
                                            className="w-4 h-4 rounded cursor-pointer"
                                        />
                                    </div>

                                    {/* Issue Info */}
                                    <div className="col-span-1 md:col-span-5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: isFailed ? "#f43f5e" : isDeadLetter ? "#f59e0b" : "#10b981" }}
                                            />
                                            <span className="font-bold text-sm hover:underline" style={{ color: "var(--text)" }}>
                                                {job.latestAttempt?.errorName || "Fatal Crash"}
                                            </span>
                                        </div>
                                        <div className="text-xs truncate font-mono" style={{ color: "var(--text-muted)" }}>
                                            {job.latestAttempt?.errorMessage || "No error message captured"}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono">
                                            <span
                                                className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                                                style={{
                                                    backgroundColor: isFailed ? "var(--badge-red-bg)" : "var(--badge-amber-bg)",
                                                    color: isFailed ? "var(--badge-red-text)" : "var(--badge-amber-text)",
                                                    borderColor: isFailed ? "var(--badge-red-border)" : "var(--badge-amber-border)",
                                                }}
                                            >
                                                {job.status}
                                            </span>
                                            <span style={{ color: "var(--text-faint)" }}>Job ID: {job.externalJobId}</span>
                                        </div>
                                    </div>

                                    {/* Queue */}
                                    <div className="col-span-1 md:col-span-2 flex md:block items-center justify-between text-xs font-mono">
                                        <span className="md:hidden" style={{ color: "var(--text-faint)" }}>Queue:</span>
                                        <span
                                            className="px-2 py-0.5 rounded border text-[11px] font-medium"
                                            style={{
                                                backgroundColor: "var(--surface)",
                                                borderColor: "var(--border)",
                                                color: "#06b6d4",
                                            }}
                                        >
                                            {job.queueName}
                                        </span>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="col-span-1 md:col-span-2 flex md:block items-center justify-between text-xs font-mono">
                                        <span className="md:hidden" style={{ color: "var(--text-faint)" }}>Status:</span>
                                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                            {job.status}
                                        </span>
                                    </div>

                                    {/* Attempts */}
                                    <div className="col-span-1 md:col-span-1 flex md:block items-center justify-between font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                                        <span className="md:hidden" style={{ color: "var(--text-faint)" }}>Attempts:</span>
                                        <span>{job.totalAttempts} att.</span>
                                    </div>

                                    {/* Age */}
                                    <div className="col-span-1 md:col-span-1 flex md:block items-center justify-between text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                                        <span className="md:hidden" style={{ color: "var(--text-faint)" }}>Updated:</span>
                                        <span>{new Date(job.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedJobIds.size}
                onClearSelection={() => setSelectedJobIds(new Set())}
            />
        </div>
    );
};
