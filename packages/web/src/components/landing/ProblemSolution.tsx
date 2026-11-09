import React from "react";
import {  CheckCircle2, RefreshCw, Zap } from "lucide-react";

export const ProblemSolution: React.FC = () => {
  return (
    <section id="the-problem" className="py-20 px-4 md:px-8 max-w-6xl mx-auto space-y-16 scroll-mt-24">
      
      {/* 1. THE PROBLEM */}
      <div className="space-y-8">
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
            The Reality of Background Jobs
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-sans" style={{ color: "var(--text)" }}>
            Why background queues are <br />
            <span className="font-editorial text-rose-400 font-normal">impossible to debug.</span>
          </h2>
          <p className="text-sm font-sans max-w-2xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
            When an HTTP request fails, you get an immediate status code. When an async job fails, it happens minutes later in an isolated worker thread. Traditional tools leave three massive blindspots:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400 font-bold text-xs">
              01
            </div>
            <h3 className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>The Retry Blindspot</h3>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Attempt 1 times out contacting Stripe after writing to the database. Attempt 2 fails immediately with a UniqueConstraintViolation. Standard loggers show only the second error, hiding the real root cause.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400 font-bold text-xs">
              02
            </div>
            <h3 className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>The Poison Pill Dilemma</h3>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
              At 2:00 AM, an alert fires: "200 jobs failed". Is your PostgreSQL connection pool dead, or is one malformed user payload retrying infinitely? Queue dashboards can’t tell the difference.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-400 font-bold text-xs">
              03
            </div>
            <h3 className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>The Egress Bill Shock</h3>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Running traditional APMs across 50,000 jobs/minute creates massive network egress and cloud bills, even though 99.9% of jobs succeed smoothly.
            </p>
          </div>
        </div>
      </div>

      {/* 2. THE SOLUTION */}
      <div className="space-y-8 border-t pt-16" style={{ borderColor: "var(--border)" }}>
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
            The JobInspector Paradigm
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-sans" style={{ color: "var(--text)" }}>
            The Black Box Flight Recorder. <br />
            <span className="font-editorial text-purple-400 font-normal">Flush only on failure.</span>
          </h2>
          <p className="text-sm font-sans max-w-2xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Instead of logging every transaction to the cloud, JobInspector behaves like an airplane's black box. It observes silently in worker memory, costs $0 on success, and delivers a full forensic autopsy when an error occurs:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl space-y-3" style={{ borderColor: "rgba(127, 75, 245, 0.3)" }}>
            <Zap className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>Zero Egress on Success</h3>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Traces are stored in a bounded 50-item circular ring buffer. If a job succeeds, the buffer is garbage-collected. Zero network calls. Zero database bloat.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3" style={{ borderColor: "rgba(6, 182, 212, 0.3)" }}>
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>Compute-on-Read Diff</h3>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Compares Attempt 1 vs Attempt 2 dynamically on read. Tells you if the error shifted, calculates duration deltas, and aligns traces backwards from the crash.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>Instant Local Replay</h3>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Download the failure artifact and replay it against your local worker code with mocked HTTP stubs. Debug production crashes in VS Code without cloud credentials.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
};
