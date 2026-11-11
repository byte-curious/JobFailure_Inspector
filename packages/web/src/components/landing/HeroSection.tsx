import React, { useState } from "react";
import { ArrowRight, Terminal, Copy, Workflow, Server, Database, Radio, Check } from "lucide-react";
import { useToast } from "../Toast";

type HeroSectionProps = {
    onOpenConsole: () => void;
    onOpenDocs: () => void;
};

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenConsole, onOpenDocs }) => {
    const [copied, setCopied] = useState(false);
    const { showToast } = useToast();

    const installCmd = "npm i @morpheus.live/sdk";

    const copyInstall = () => {
        navigator.clipboard.writeText(installCmd);
        setCopied(true);
        showToast("Copied to clipboard: " + installCmd);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="relative pt-32 pb-20 px-4 md:px-8 max-w-6xl mx-auto space-y-12">
            {/* Background Radial Glow Mesh */}
            <div
                className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-25"
                style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
            />

            {/* Hero Typography (Apple / Render Scale) */}
            {/* Hero Typography (Removed version pill, scaled up Apple typography) */}
            <div className="text-center space-y-6 max-w-4xl mx-auto relative z-10 pt-4">
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.06]" style={{ color: "var(--text)" }}>
                    Never debug background <br className="hidden sm:inline" />
                    jobs in the <span className="font-editorial text-purple-400 font-normal">dark again.</span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl font-sans max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Traditional APMs charge for every successful job. JobInspector records execution in an in-memory ring buffer, costs $0 on success, and gives you a <strong>side-by-side retry diff</strong> when workers fail.
                </p>

                {/* CTA Button Group */}
                <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                    <button
                        onClick={onOpenConsole}
                        className="flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm text-white shadow-xl transition hover:opacity-90 hover:scale-102 active:scale-98"
                        style={{ backgroundColor: "var(--accent)" }}
                    >
                        <span>Launch Live Console</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                        onClick={onOpenDocs}
                        className="px-6 py-3.5 rounded-full font-medium text-sm border transition hover:opacity-80 backdrop-blur-md"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
                    >
                        View Documentation
                    </button>

                    {/* 1-Click Copy Install */}
                    <div
                        onClick={copyInstall}
                        className="flex items-center gap-2 px-4 py-3 rounded-full border font-mono text-xs cursor-pointer transition hover:border-purple-500/50"
                        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text-muted)" }}
                    >
                        <Terminal className="w-3.5 h-3.5 text-purple-400" />
                        <span>{installCmd}</span>
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-50" />}
                    </div>
                </div>
            </div>

            {/* RENDER-STYLE WORKER CANVAS (High-contrast text & glassmorphism) */}
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6" style={{ borderColor: "var(--border)" }}>
                {/* Fixed: High-contrast header for Light and Warm themes */}
                <div className="flex items-center justify-between border-b pb-4 text-xs font-mono" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold" style={{ color: "var(--text)" }}>PRODUCTION WORKER PIPELINE</span>
                        <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>• Live telemetry stream</span>
                    </div>
                    <span className="text-[11px] text-purple-400 font-semibold hidden sm:inline">Automatic Boundary Interception</span>
                </div>


                {/* 2-Column Visual Workspace: Left Node Grid / Right Live Terminal */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

                    {/* Left 6 Cols: Render-Style Node Graph with Hover Lift */}
                    <div className="lg:col-span-6 grid grid-cols-2 gap-3.5 font-mono text-xs">
                        {/* Node 1: Worker */}
                        <div
                            className="p-4 rounded-2xl border glass space-y-2 landing-card-lift cursor-pointer"
                            style={{ borderColor: "rgba(6, 182, 212, 0.4)", backgroundColor: "rgba(6, 182, 212, 0.05)" }}
                        >
                            <div className="flex items-center justify-between">
                                <Workflow className="w-4 h-4 text-cyan-400" />
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-400 font-bold">CLIENT</span>
                            </div>
                            <div className="font-bold font-sans text-sm" style={{ color: "var(--text)" }}>BullMQ Worker</div>
                            <p className="text-[11px] text-[var(--text-muted)]">In-Memory Ring Buffer (50 max)</p>
                        </div>

                        {/* Node 2: Fastify Gateway */}
                        <div
                            className="p-4 rounded-2xl border glass space-y-2 landing-card-lift cursor-pointer"
                            style={{ borderColor: "rgba(127, 75, 245, 0.4)", backgroundColor: "rgba(127, 75, 245, 0.05)" }}
                        >
                            <div className="flex items-center justify-between">
                                <Server className="w-4 h-4 text-purple-400" />
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/30 text-purple-400 font-bold">GATEWAY</span>
                            </div>
                            <div className="font-bold font-sans text-sm" style={{ color: "var(--text)" }}>Fastify Daemon</div>
                            <p className="text-[11px] text-[var(--text-muted)]">Single-Tx Atomic Ingestion</p>
                        </div>

                        {/* Node 3: PostgreSQL */}
                        <div
                            className="p-4 rounded-2xl border glass space-y-2 landing-card-lift cursor-pointer"
                            style={{ borderColor: "rgba(245, 158, 11, 0.4)", backgroundColor: "rgba(245, 158, 11, 0.05)" }}
                        >
                            <div className="flex items-center justify-between">
                                <Database className="w-4 h-4 text-amber-400" />
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 font-bold">STORAGE</span>
                            </div>
                            <div className="font-bold font-sans text-sm" style={{ color: "var(--text)" }}>PostgreSQL 16</div>
                            <p className="text-[11px] text-[var(--text-muted)]">3-Tier Partitioned Retention</p>
                        </div>

                        {/* Node 4: Alert Outbox */}
                        <div
                            className="p-4 rounded-2xl border glass space-y-2 landing-card-lift cursor-pointer"
                            style={{ borderColor: "rgba(244, 63, 94, 0.4)", backgroundColor: "rgba(244, 63, 94, 0.05)" }}
                        >
                            <div className="flex items-center justify-between">
                                <Radio className="w-4 h-4 text-rose-400" />
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/30 text-rose-400 font-bold">OUTBOX</span>
                            </div>
                            <div className="font-bold font-sans text-sm" style={{ color: "var(--text)" }}>Alert Dispatcher</div>
                            <p className="text-[11px] text-[var(--text-muted)]">Slack & Discord Rate-Capped</p>
                        </div>
                    </div>

                    {/* Right 6 Cols: Live Replay Terminal */}
                    <div
                        className="lg:col-span-6 rounded-2xl border overflow-hidden font-mono text-xs flex flex-col shadow-2xl landing-card-lift cursor-pointer"
                        style={{ backgroundColor: "#0c0a14", borderColor: "var(--border)" }}
                    >
                        <div className="px-4 py-3 border-b flex items-center justify-between bg-black/40 text-[11px]" style={{ borderColor: "#241f3b" }}>
                            <span className="text-zinc-300 font-bold">Local Forensic Replay</span>
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Mock Agent Active
                            </span>
                        </div>

                        <div className="p-4 space-y-2 leading-relaxed text-zinc-300 overflow-x-auto text-[11px]">
                            <div className="text-zinc-500">$ npx job-inspector pull 69811baf --out ./debug.json</div>
                            <div className="text-purple-400 pl-2">✔ Downloaded failure artifact (.replay.json)</div>
                            <div className="text-zinc-500 pl-2">Loaded 1 recorded HTTP response fixture</div>

                            <div className="pt-1 text-zinc-500">$ npx job-inspector replay --file ./debug.json --worker ./worker.ts</div>
                            <div className="text-cyan-400 pl-2">[Mock Agent] Intercepted POST https://api.stripe.com/charges ➔ Replying 504 Timeout</div>
                            <div className="text-rose-400 font-bold pl-2">✖ CRASH REPRODUCED: Exact match with production failure!</div>
                            <div className="text-emerald-400 font-semibold pl-2">✔ Ready for local VS Code debugging with zero cloud costs.</div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
