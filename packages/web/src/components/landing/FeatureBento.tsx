import React from "react";
import { Cpu, Layers, Zap, Lock } from "lucide-react";

export const FeatureBento: React.FC = () => {
  return (
    <section className="py-20 px-4 md:px-8 max-w-6xl mx-auto space-y-12">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans" style={{ color: "var(--text)" }}>
          Engineered for distributed systems. <br />
          <span className="font-editorial text-purple-400 font-normal text-4xl sm:text-5xl">Built for developers.</span>
        </h2>
        <p className="text-xs sm:text-sm font-mono" style={{ color: "var(--text-muted)" }}>
          Four core capabilities designed specifically for asynchronous background worker debugging.
        </p>
      </div>

      {/* Asymmetric Bento Grid (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Card 1: Ring Buffer (7 Cols) */}
        <div className="md:col-span-7 glass-panel rounded-3xl p-8 space-y-4 relative overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>
            In-Memory Ring Buffer & Zero-Cost Sampling
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Traditional APMs log 100% of jobs, producing massive egress bills even when 99% of jobs succeed. JobInspector records a bounded 50-item circular buffer in worker RAM via Node.js AsyncLocalStorage. When a job succeeds, the trace is garbage-collected. <strong>You pay $0 network and database writes on successful runs.</strong>
          </p>
        </div>

        {/* Card 2: Retry Diff (5 Cols) */}
        <div className="md:col-span-5 glass-panel rounded-3xl p-8 space-y-4 relative overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>
            Compute-on-Read Retry Diff
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Did Attempt 1 write database rows and cause Attempt 2 to fail with a UniqueConstraintViolation? Our diff engine highlights root-cause shifts, duration changes, and Promise.all async reordering side-by-side.
          </p>
        </div>

        {/* Card 3: Blast Radius Classifier (5 Cols) */}
        <div className="md:col-span-5 glass-panel rounded-3xl p-8 space-y-4 relative overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>
            Poison Pill vs. Outage Classifier
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Evaluates a 5-minute rolling window per queue to distinguish 1 malformed user payload stuck in an infinite retry loop (Poison Pill) from 500 distinct jobs failing simultaneously due to a database drop (Shared Outage).
          </p>
        </div>

        {/* Card 4: Client-Side DLP & Security (7 Cols) */}
        <div className="md:col-span-7 glass-panel rounded-3xl p-8 space-y-4 relative overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>
            Client-Side PII & Credential Sanitizer
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Runs recursively inside the worker process before data is ever sent over the wire. Redacts passwords, Bearer tokens, and Stripe keys. Preserves Date objects, truncates large strings, summarizes binary Buffers, and protects against call-stack crashes on circular references using a WeakSet.
          </p>
        </div>

      </div>
    </section>
  );
};
