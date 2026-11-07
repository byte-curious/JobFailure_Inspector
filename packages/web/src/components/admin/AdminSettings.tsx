import React, { useEffect, useState } from "react";
import {
    Key,
    Bell,
    Cpu,
    Database,
    Send,
    Copy,
    Server,
    Workflow,
    Radio,
    CheckCircle2,
} from "lucide-react";
import { fetchSystemDiagnostics, sendTestWebhook } from "../../api/client";
import { useToast } from "../Toast";

export const AdminSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"api" | "webhook" | "architecture">("architecture");
    const [diagnostics, setDiagnostics] = useState<any>(null);
    const [testWebhookUrl, setTestWebhookUrl] = useState("");
    const [sendingTest, setSendingTest] = useState(false);

    const { showToast } = useToast();

    const loadDiagnostics = () => {
        fetchSystemDiagnostics()
            .then(setDiagnostics)
            .catch((err) => console.error("Error loading diagnostics:", err));
    };

    useEffect(() => {
        loadDiagnostics();
        const interval = setInterval(loadDiagnostics, 5000); // Live refresh every 5 seconds!
        return () => clearInterval(interval);
    }, []);

    const handleSendTestAlert = async () => {
        setSendingTest(true);
        try {
            const res = await sendTestWebhook(testWebhookUrl || undefined);
            showToast(`Test alert successfully delivered to ${res.host}! Check Discord/Slack.`);
        } catch (err) {
            showToast(`Failed: ${(err as Error).message}`);
        } finally {
            setSendingTest(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} copied to clipboard`);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="border-b pb-4" style={{ borderColor: "var(--border)" }}>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                    Settings & Live Architecture
                </h1>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                    API keys, webhook alerts, live server memory, and interactive architecture health
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b pb-2 text-xs font-mono" style={{ borderColor: "var(--border)" }}>
                <button
                    onClick={() => setActiveTab("architecture")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium"
                    style={{
                        backgroundColor: activeTab === "architecture" ? "var(--surface-hover)" : "transparent",
                        color: activeTab === "architecture" ? "var(--text)" : "var(--text-muted)",
                        border: activeTab === "architecture" ? "1px solid var(--border)" : "1px solid transparent",
                    }}
                >
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>Live Architecture & Health</span>
                </button>

                <button
                    onClick={() => setActiveTab("api")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium"
                    style={{
                        backgroundColor: activeTab === "api" ? "var(--surface-hover)" : "transparent",
                        color: activeTab === "api" ? "var(--text)" : "var(--text-muted)",
                        border: activeTab === "api" ? "1px solid var(--border)" : "1px solid transparent",
                    }}
                >
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>API Keys & SDK Setup</span>
                </button>

                <button
                    onClick={() => setActiveTab("webhook")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium"
                    style={{
                        backgroundColor: activeTab === "webhook" ? "var(--surface-hover)" : "transparent",
                        color: activeTab === "webhook" ? "var(--text)" : "var(--text-muted)",
                        border: activeTab === "webhook" ? "1px solid var(--border)" : "1px solid transparent",
                    }}
                >
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>Webhook Alert Integration</span>
                </button>
            </div>

            {/* TAB 1: LIVE ARCHITECTURE & HEALTH */}
            {activeTab === "architecture" && (
                <div className="space-y-6">
                    {/* Live Backend Telemetry Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="glass-panel rounded-xl p-4 space-y-1">
                            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>PostgreSQL 16 Ping</span>
                            <div
                                className="text-2xl font-bold font-mono"
                                style={{
                                    color: (diagnostics?.database?.latencyMs ?? 0) > 50 ? "#f59e0b" : "#10b981",
                                }}
                            >
                                {diagnostics?.database?.latencyMs != null ? `${diagnostics.database.latencyMs} ms` : "..."}
                            </div>
                            <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Driver: @prisma/adapter-pg
                            </span>
                        </div>

                        <div className="glass-panel rounded-xl p-4 space-y-1">
                            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Node.js Memory (RSS)</span>
                            <div className="text-2xl font-bold font-mono" style={{ color: "var(--text)" }}>
                                {diagnostics?.server?.memory?.rssMb ?? "0"} MB
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
                                Heap: {diagnostics?.server?.memory?.heapUsedMb ?? "0"} MB
                            </span>
                        </div>

                        <div className="glass-panel rounded-xl p-4 space-y-1">
                            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Outbox Daemon</span>
                            <div className="text-2xl font-bold font-mono text-purple-400">
                                {diagnostics?.outbox?.status ?? "ACTIVE"}
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
                                Pending: {diagnostics?.outbox?.pendingCount ?? 0} | Dead: {diagnostics?.outbox?.deadCount ?? 0}
                            </span>
                        </div>

                        <div className="glass-panel rounded-xl p-4 space-y-1">
                            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Process Uptime</span>
                            <div className="text-2xl font-bold font-mono text-cyan-400">
                                {diagnostics ? `${Math.floor(diagnostics.server.uptimeSeconds / 60)}m` : "..."}
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
                                Runtime: {diagnostics?.server?.nodeVersion ?? "v20"}
                            </span>
                        </div>
                    </div>

                    {/* DATA-DRIVEN TOPOLOGY SERVICE MAP (With Flowchart Connectors & Universal Gateway) */}
                    <div className="glass-panel rounded-xl p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                                    Data-Driven Service Topology
                                </h3>
                                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                                    Real-time pipeline flow from background queues to ingestion gateway and persistence
                                </p>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono">
                                <span className="flex items-center gap-1.5 text-emerald-500">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy
                                </span>
                                <span className="flex items-center gap-1.5 text-rose-400">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Incident Active
                                </span>
                            </div>
                        </div>

                        {/* FLOWCHART WORKSPACE WITH CONNECTORS */}
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 font-mono text-xs">

                            {/* COLUMN 1: DYNAMIC QUEUE WORKERS */}
                            <div className="w-full lg:w-72 space-y-3 shrink-0 max-h-[380px] overflow-y-auto pr-1">
                                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 sticky top-0 py-1 z-10" style={{ color: "var(--text-faint)", backgroundColor: "var(--surface)" }}>
                                    Worker Queues ({diagnostics?.topology?.queues?.length || 0})
                                </div>

                                {diagnostics?.topology?.queues?.map((queue: any) => {
                                    const isDegraded = queue.status === "DEGRADED";
                                    return (
                                        <div
                                            key={queue.name}
                                            className="p-3.5 rounded-xl border transition glass-panel"
                                            style={{
                                                borderColor: isDegraded ? "rgba(244, 63, 94, 0.4)" : "var(--border)",
                                                backgroundColor: isDegraded ? "rgba(244, 63, 94, 0.06)" : "var(--surface)",
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold flex items-center gap-1.5 font-sans" style={{ color: "var(--text)" }}>
                                                    <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                                                    <span>{queue.name}</span>
                                                </span>
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{
                                                        backgroundColor: isDegraded ? "#f43f5e" : "#10b981",
                                                        animation: isDegraded ? "pulse 1.5s infinite" : "none",
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span style={{ color: "var(--text-muted)" }}>Failures recorded:</span>
                                                <strong style={{ color: "var(--text)" }}>{queue.failuresCount}</strong>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* CONNECTOR 1: Flow into Ingestion Gateway */}
                            <div className="flex flex-col items-center justify-center shrink-0 my-2 lg:my-0">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border mb-1" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text-faint)" }}>
                                    HTTP POST
                                </span>
                                <div className="flex items-center text-purple-400 font-bold">
                                    <span className="hidden lg:inline">────►</span>
                                    <span className="lg:hidden text-base">▼</span>
                                </div>
                            </div>

                            {/* COLUMN 2: UNIVERSAL INGESTION GATEWAY */}
                            <div
                                className="w-full lg:w-80 p-5 rounded-2xl border text-center space-y-2.5 glass-panel shrink-0"
                                style={{
                                    borderColor: "rgba(127, 75, 245, 0.4)",
                                    backgroundColor: "rgba(127, 75, 245, 0.05)",
                                }}
                            >
                                <Server className="w-8 h-8 text-purple-400 mx-auto" />
                                <div>
                                    <div className="font-bold text-sm font-sans" style={{ color: "var(--text)" }}>
                                        JobInspector Gateway
                                    </div>
                                    <div className="text-[11px] text-purple-400 font-mono mt-0.5">
                                        Engine: Fastify Daemon (Port {diagnostics?.server?.port || 3000})
                                    </div>
                                </div>

                                <div
                                    className="text-[10px] px-2 py-1 rounded border font-mono leading-tight"
                                    style={{
                                        borderColor: "rgba(127, 75, 245, 0.25)",
                                        backgroundColor: "rgba(127, 75, 245, 0.1)",
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    Compatible with: Express • NestJS • Next.js • Fastify
                                </div>
                            </div>

                            {/* CONNECTOR 2: Flow into Persistence & Alerts */}
                            <div className="flex flex-col items-center justify-center shrink-0 my-2 lg:my-0">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border mb-1" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text-faint)" }}>
                                    Persistence
                                </span>
                                <div className="flex items-center text-purple-400 font-bold">
                                    <span className="hidden lg:inline">────►</span>
                                    <span className="lg:hidden text-base">▼</span>
                                </div>
                            </div>

                            {/* COLUMN 3: PERSISTENCE & ALERT DESTINATIONS */}
                            <div className="w-full lg:w-80 space-y-3 shrink-0">
                                <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>
                                    Storage & Alert Pipeline
                                </div>

                                {/* PostgreSQL Node */}
                                <div className="p-3.5 rounded-xl border glass-panel flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                                    <div className="flex items-center gap-2.5">
                                        <Database className="w-4 h-4 text-amber-400 shrink-0" />
                                        <div>
                                            <div className="font-bold font-sans" style={{ color: "var(--text)" }}>PostgreSQL 16</div>
                                            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>SQL Connection Pool</div>
                                        </div>
                                    </div>
                                    <span
                                        className="text-[11px] font-bold"
                                        style={{
                                            color: (diagnostics?.database?.latencyMs ?? 0) > 50 ? "#f59e0b" : "#10b981",
                                        }}
                                    >
                                        ● {diagnostics?.database?.latencyMs || 1}ms Ping
                                    </span>
                                </div>

                                {/* Outbox Dispatcher Node */}
                                <div className="p-3.5 rounded-xl border glass-panel flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                                    <div className="flex items-center gap-2.5">
                                        <Radio className="w-4 h-4 text-rose-400 shrink-0" />
                                        <div>
                                            <div className="font-bold font-sans" style={{ color: "var(--text)" }}>Outbox Dispatcher</div>
                                            <div className="text-[11px] text-rose-400 font-bold truncate max-w-[140px]">
                                                {diagnostics?.webhook?.host || "No Webhook"}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-purple-400 font-bold">
                                        3s Poller Active
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ACTIVE ENVIRONMENT CONFIGURATION SUMMARY */}
                    <div className="glass-panel rounded-xl p-5 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                            Active Environment Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                            <div className="p-3 rounded-lg border flex justify-between" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Alert Destination:</span>
                                <strong className="text-purple-400">{diagnostics?.webhook?.host || "Discord Webhook"}</strong>
                            </div>
                            <div className="p-3 rounded-lg border flex justify-between" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Alert Sensitivity:</span>
                                <strong className="text-emerald-400">Calm Mode (Suppresses 1-off transient retries)</strong>
                            </div>
                            <div className="p-3 rounded-lg border flex justify-between" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Storage Policy:</span>
                                <strong style={{ color: "var(--text)" }}>Hot (7d) • Warm (30d) • Cold (30d+)</strong>
                            </div>
                            <div className="p-3 rounded-lg border flex justify-between" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Outbox Lease Window:</span>
                                <strong style={{ color: "var(--text)" }}>45s Lease (SKIP LOCKED)</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: API KEYS & SDK SETUP */}
            {activeTab === "api" && (
                <div className="glass-panel rounded-xl p-6 space-y-6">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                            Project Ingestion Credentials
                        </h3>
                        <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                            Pass these credentials in your BullMQ worker to authenticate failures
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-mono font-bold" style={{ color: "var(--text-muted)" }}>Ingestion Endpoint</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    readOnly
                                    value={`${window.location.origin}/v1/events/failure`}
                                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border bg-black/10 focus:outline-none"
                                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                                />
                                <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/v1/events/failure`, "Endpoint URL")}
                                    className="px-3 py-2 rounded-lg border text-xs font-mono flex items-center gap-1 shrink-0 hover:opacity-80"
                                    style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-mono font-bold" style={{ color: "var(--text-muted)" }}>Project API Key (Production)</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    readOnly
                                    value="insp_live_local_development_key"
                                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border bg-black/10 focus:outline-none text-purple-400 font-bold"
                                    style={{ borderColor: "var(--border)" }}
                                />
                                <button
                                    onClick={() => copyToClipboard("insp_live_local_development_key", "API Key")}
                                    className="px-3 py-2 rounded-lg border text-xs font-mono flex items-center gap-1 shrink-0 hover:opacity-80"
                                    style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-mono font-bold" style={{ color: "var(--text-muted)" }}>Worker Integration Snippet</label>
                            <pre className="p-3.5 rounded-lg border font-mono text-xs leading-relaxed overflow-x-auto mt-1" style={{ backgroundColor: "rgba(0,0,0,0.2)", borderColor: "var(--border)", color: "var(--text)" }}>{`import { Worker } from "bullmq";
import { wrapJob, inspector } from "@job-inspector/sdk";

const worker = new Worker("invoices", wrapJob(async (job) => {
  // Outgoing fetch calls are auto-intercepted!
  await fetch("https://api.stripe.com/v1/charges");
}, {
  ingestionUrl: "${window.location.origin}/v1/events/failure",
  apiKey: "insp_live_local_development_key"
}));`}</pre>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: WEBHOOK ALERTS */}
            {activeTab === "webhook" && (
                <div className="glass-panel rounded-xl p-6 space-y-6">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>
                            Discord & Slack Alert Routing
                        </h3>
                        <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                            Configure where incident alerts and dead-letter summaries are dispatched
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-mono font-bold" style={{ color: "var(--text-muted)" }}>Webhook URL (Discord or Slack)</label>
                            <input
                                type="text"
                                placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                                value={testWebhookUrl}
                                onChange={(e) => setTestWebhookUrl(e.target.value)}
                                className="w-full text-xs font-mono px-3 py-2 rounded-lg border mt-1 focus:outline-none"
                                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
                            />
                            <p className="text-[11px] font-mono mt-1" style={{ color: "var(--text-faint)" }}>
                                Currently configured destination: <strong className="text-purple-400">{diagnostics?.webhook?.host || "None (Using environment variable)"}</strong>
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleSendTestAlert}
                                disabled={sendingTest}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition"
                                style={{ backgroundColor: "var(--accent)" }}
                            >
                                <Send className={`w-3.5 h-3.5 ${sendingTest ? "animate-spin" : ""}`} />
                                <span>{sendingTest ? "Sending Test..." : "🔔 Send Test Notification"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
