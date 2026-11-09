import React from "react";

export const ComparisonSection: React.FC = () => {
  return (
    <section id="comparison-section" className="py-24 px-4 md:px-8 max-w-6xl mx-auto space-y-12 scroll-mt-24">
      {/* Editorial Hook & Copywriting */}
      <div className="space-y-4 max-w-3xl mx-auto text-center">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
          The Architectural Mismatch
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-sans" style={{ color: "var(--text)" }}>
          Built for queues. <br />
          <span className="font-editorial text-purple-400 font-normal text-4xl sm:text-5xl">Not web requests.</span>
        </h2>
        <p className="text-sm md:text-base font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
          You wouldn’t use a browser error tracker to monitor PostgreSQL replication. Why use one for your distributed workers? Traditional tools leave two fatal blindspots in background architectures:
        </p>

        {/* 2 Persuasive Hook Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-4">
          <div className="glass-panel p-5 rounded-2xl space-y-2 border" style={{ borderColor: "var(--border)" }}>
            <h4 className="font-bold text-sm font-sans" style={{ color: "var(--text)" }}>1. The Asynchronous Retry Gap</h4>
            <p className="text-xs font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Sentry groups errors by static stack traces. But when Attempt 1 writes to the database and times out, Attempt 2 crashes with a UniqueConstraintViolation. Sentry logs these as two disconnected bugs. JobInspector diffs them side-by-side.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl space-y-2 border" style={{ borderColor: "var(--border)" }}>
            <h4 className="font-bold text-sm font-sans" style={{ color: "var(--text)" }}>2. The $0 Egress Guarantee</h4>
            <p className="text-xs font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Datadog traces 100% of jobs over the network to catch a 0.1% failure rate, creating massive bandwidth bills. JobInspector records in worker RAM and sends 0 bytes on success. You only pay for what actually fails.
            </p>
          </div>
        </div>
      </div>

      {/* The High-Contrast Comparison Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border shadow-xl" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-wider"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-hover)",
                  color: "var(--text-faint)",
                }}
              >
                <th className="py-4 px-5">Capability / Metric</th>
                <th className="py-4 px-5 text-purple-400 font-bold text-sm">JobInspector</th>
                <th className="py-4 px-5" style={{ color: "var(--text)" }}>Sentry</th>
                <th className="py-4 px-5" style={{ color: "var(--text)" }}>Datadog APM</th>
                <th className="py-4 px-5" style={{ color: "var(--text)" }}>Bull-Board</th>
              </tr>
            </thead>
            <tbody className="divide-y font-sans" style={{ borderColor: "var(--border)" }}>
              <tr>
                <td className="py-4 px-5 font-bold" style={{ color: "var(--text)" }}>Primary Specialization</td>
                <td className="py-4 px-5 text-purple-400 font-bold font-mono">Background Jobs & Queues</td>
                <td className="py-4 px-5" style={{ color: "var(--text-muted)" }}>Frontend & HTTP APIs</td>
                <td className="py-4 px-5" style={{ color: "var(--text-muted)" }}>Full Distributed Tracing</td>
                <td className="py-4 px-5" style={{ color: "var(--text-muted)" }}>Redis Queue Counters</td>
              </tr>
              <tr>
                <td className="py-4 px-5 font-bold" style={{ color: "var(--text)" }}>Retry Mutation Diff</td>
                <td className="py-4 px-5 text-purple-400 font-bold font-mono">✔ Compute-on-read Diff</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ Disconnected errors</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ No retry mutation diff</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ None</td>
              </tr>
              <tr>
                <td className="py-4 px-5 font-bold" style={{ color: "var(--text)" }}>Network Cost at 50k jobs/min</td>
                <td className="py-4 px-5 text-purple-400 font-bold font-mono">$0 (Tail-based flush on error)</td>
                <td className="py-4 px-5" style={{ color: "var(--text-muted)" }}>High per-event volume bills</td>
                <td className="py-4 px-5" style={{ color: "var(--text-muted)" }}>Extremely High ($$$)</td>
                <td className="py-4 px-5" style={{ color: "var(--text-muted)" }}>$0 (Local Redis)</td>
              </tr>
              <tr>
                <td className="py-4 px-5 font-bold" style={{ color: "var(--text)" }}>Local Replay Runner</td>
                <td className="py-4 px-5 text-purple-400 font-bold font-mono">✔ .replay.json + HTTP Stubs</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ No local runner</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ No local runner</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ None</td>
              </tr>
              <tr>
                <td className="py-4 px-5 font-bold" style={{ color: "var(--text)" }}>Poison Pill vs Outage Triage</td>
                <td className="py-4 px-5 text-purple-400 font-bold font-mono">✔ Automatic Blast Radius</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ Generic stack grouping</td>
                <td className="py-4 px-5" style={{ color: "var(--text-muted)" }}>Manual alert rules</td>
                <td className="py-4 px-5 font-mono text-rose-500 font-semibold">✖ None</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
