import React, { useState } from "react";
import { Play, RotateCcw, Zap, Terminal, Layers } from "lucide-react";

type ScenarioId = "timeout" | "drift" | "outage";

export const InteractiveDemo: React.FC = () => {
  const [scenario, setScenario] = useState<ScenarioId>("drift");

  return (
    <section id="interactive-demo" className="py-20 px-4 md:px-8 max-w-6xl mx-auto space-y-8 scroll-mt-24">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono text-purple-400 bg-purple-500/10 border-purple-500/20">
          <Play className="w-3 h-3 fill-current" />
          <span>Interactive Live Simulation</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-sans" style={{ color: "var(--text)" }}>
          Test-drive the flight recorder. <br />
          <span className="font-editorial text-purple-400 font-normal text-4xl sm:text-5xl">Zero setup required.</span>
        </h2>
        <p className="text-sm font-sans max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Click the scenarios below to watch JobInspector compute execution diffs and triage blast radiuses in real time.
        </p>
      </div>

      {/* Interactive Sandbox Card */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border space-y-6" style={{ borderColor: "var(--border)" }}>
        
        {/* Scenario Selector Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold mr-1" style={{ color: "var(--text-faint)" }}>SCENARIOS:</span>

            <button
              onClick={() => setScenario("timeout")}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition flex items-center gap-1.5"
              style={{
                backgroundColor: scenario === "timeout" ? "var(--accent)" : "var(--surface)",
                borderColor: scenario === "timeout" ? "var(--accent)" : "var(--border)",
                color: scenario === "timeout" ? "#ffffff" : "var(--text)",
              }}
            >
              <span>1. Egress Timeout (Att 1)</span>
            </button>

            <button
              onClick={() => setScenario("drift")}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition flex items-center gap-1.5"
              style={{
                backgroundColor: scenario === "drift" ? "var(--accent)" : "var(--surface)",
                borderColor: scenario === "drift" ? "var(--accent)" : "var(--border)",
                color: scenario === "drift" ? "#ffffff" : "var(--text)",
              }}
            >
              <RotateCcw className="w-3 h-3" />
              <span>2. Retry Mutation Drift (Att 2)</span>
            </button>

            <button
              onClick={() => setScenario("outage")}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition flex items-center gap-1.5"
              style={{
                backgroundColor: scenario === "outage" ? "var(--accent)" : "var(--surface)",
                borderColor: scenario === "outage" ? "var(--accent)" : "var(--border)",
                color: scenario === "outage" ? "#ffffff" : "var(--text)",
              }}
            >
              <Zap className="w-3 h-3" />
              <span>3. Shared Outage Burst (500 Jobs)</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-[var(--text-faint)]">
            ● Live Evaluated on Read
          </span>
        </div>

        {/* Live Simulation Output Workspace (Instant render, no flashing!) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Simulated Worker Execution (5 Cols) */}
          <div className="lg:col-span-5 rounded-2xl border p-5 space-y-4 font-mono text-xs flex flex-col justify-between shadow-inner" style={{ backgroundColor: "#0c0a14", borderColor: "var(--border)" }}>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5 text-[11px]" style={{ borderColor: "#241f3b" }}>
                <span className="text-purple-400 font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> Worker Execution Telemetry
                </span>
                <span className="text-zinc-500">Node.js 20</span>
              </div>

              {scenario === "timeout" && (
                <div className="space-y-1.5 text-zinc-300 leading-relaxed">
                  <div className="text-cyan-400">queue.process("invoice", job_101)</div>
                  <div className="text-zinc-500 pl-3">↳ inspector.checkpoint("Validate invoice")</div>
                  <div className="text-zinc-500 pl-3">↳ fetch("https://api.stripe.com/v1/charges")</div>
                  <div className="text-rose-400 font-bold pl-3">✖ HTTP 504 Gateway Timeout (3,120ms)</div>
                  <div className="text-zinc-500 pl-3">↳ BullMQ scheduled retry (attempt: 2)...</div>
                </div>
              )}

              {scenario === "drift" && (
                <div className="space-y-1.5 text-zinc-300 leading-relaxed">
                  <div className="text-amber-400">queue.retry("invoice", job_101, attempt: 2)</div>
                  <div className="text-zinc-500 pl-3">↳ inspector.checkpoint("Validate invoice")</div>
                  <div className="text-zinc-500 pl-3">{'↳ db.insert("invoices", { id: "inv_101" })'}</div>
                  <div className="text-rose-400 font-bold pl-3">✖ UniqueConstraintViolation (SQLSTATE 23505)</div>
                  <div className="text-zinc-400 pl-3">↳ Crashed at 140ms (95% faster than Att 1)</div>
                </div>
              )}

              {scenario === "outage" && (
                <div className="space-y-1.5 text-zinc-300 leading-relaxed">
                  <div className="text-rose-400 font-bold">BURST: 48 worker jobs crashed in last 5m</div>
                  <div className="text-zinc-400 pl-3">↳ job_101: ConnectionTimeout (db pool exhausted)</div>
                  <div className="text-zinc-400 pl-3">↳ job_102: ConnectionTimeout (db pool exhausted)</div>
                  <div className="text-zinc-400 pl-3">↳ job_103: ConnectionTimeout (db pool exhausted)</div>
                  <div className="text-purple-400 pl-3">↳ Clustered by normalized fingerprint: fp_db_timeout</div>
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-lg border text-[11px] text-zinc-400" style={{ borderColor: "#241f3b", backgroundColor: "#141124" }}>
              Ring Buffer: 50 steps captured • 0 dropped • Egress cost: $0
            </div>
          </div>

          {/* Right Column: Computed Diagnostic Triage & Diff (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 font-mono text-xs">
            
            {/* Triage Badge */}
            <div className="p-4 rounded-2xl border glass flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-faint)]">Automatic Incident Classification</span>
                <div className="text-sm font-bold mt-1" style={{ color: "var(--text)" }}>
                  {scenario === "outage" ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      SHARED_INCIDENT (Widespread Infrastructure Outage)
                    </span>
                  ) : scenario === "drift" ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      POISON_PILL / RETRY_DRIFT (Mutation collision across retries)
                    </span>
                  ) : (
                    <span className="text-sky-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      ISOLATED_OR_NEW_ERROR (Transient failure, retry pending)
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right text-[11px]">
                <div className="text-[var(--text-faint)]">BLAST RADIUS</div>
                <strong style={{ color: "var(--text)" }}>
                  {scenario === "outage" ? "48 jobs affected" : "1 job affected"}
                </strong>
              </div>
            </div>

            {/* Execution Diff Box */}
            {scenario === "drift" ? (
              <div className="p-4 rounded-2xl border glass space-y-2.5" style={{ borderColor: "rgba(245, 158, 11, 0.4)", backgroundColor: "rgba(245, 158, 11, 0.05)" }}>
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Live Execution Diff (Attempt 1 ➔ Attempt 2)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400">
                    Root Cause Shifted
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Error Shift:</span>
                    <span><span className="text-zinc-500">StripeTimeout</span> ➔ <strong className="text-rose-400 font-bold">UniqueConstraintViolation</strong></span>
                  </div>
                  <div className="flex justify-between border-b pb-1" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Execution Timing:</span>
                    <span className="text-emerald-400 font-bold">-2,980ms faster (crashed earlier along code path)</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-muted)" }}>Divergence Point:</span>
                    <span>DIVERGED at <strong className="underline decoration-rose-500/50">Step 1</strong> (POST /charges)</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Timeline Summary */
              <div className="p-4 rounded-2xl border glass space-y-2" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: "var(--text)" }}>
                  <span>Recorded Timeline Tail</span>
                  <span style={{ color: "var(--text-faint)" }}>00:03.120 elapsed</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2.5 rounded border flex items-center justify-between" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                    <span>Step 1: Validating customer tax ID</span>
                    <span className="text-emerald-400">00:00.010</span>
                  </div>
                  <div className="p-2.5 rounded border flex items-center justify-between border-rose-500/30 bg-rose-500/5 text-rose-400 font-bold">
                    <span>POST https://api.stripe.com/v1/charges</span>
                    <span>504 Timeout</span>
                  </div>
                </div>
              </div>
            )}

            {/* Replay Prompt */}
            <div className="p-3 rounded-xl border flex items-center justify-between text-[11px] glass" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Want to debug this crash locally?</span>
              <span className="text-purple-400 font-bold">$ npx job-inspector pull & replay</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
