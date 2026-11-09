import React from "react";
import { GitBranch, MessageSquare } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative border-t mt-20 pt-16 pb-12 px-6 overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-10 relative z-10">
        {/* Brand Info */}
        <div className="space-y-3 max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: "var(--accent)" }}>
              ⚡
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>
              Job<span className="font-editorial text-base ml-0.5" style={{ color: "var(--accent)" }}>Inspector</span>
            </span>
          </div>
          <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
            The open-source flight recorder and diagnostic triage engine for distributed background jobs.
          </p>
          <div className="text-[11px] font-mono text-[var(--text-faint)]">
            Distributed under the MIT License.
          </div>
        </div>

        {/* Links Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs font-mono">
          <div className="space-y-2.5">
            <div className="font-bold uppercase tracking-wider text-[11px]" style={{ color: "var(--text-faint)" }}>Product</div>
            <div><a href="#features" className="hover:underline text-[var(--text-muted)]">Features</a></div>
            <div><a href="#comparison-section" className="hover:underline text-[var(--text-muted)]">Comparisons</a></div>
            <div><a href="/v1/jobs" className="hover:underline text-[var(--text-muted)]">REST API</a></div>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold uppercase tracking-wider text-[11px]" style={{ color: "var(--text-faint)" }}>Resources</div>
            <div><a href="https://github.com/byte-curious/JobFailure_Inspector" target="_blank" rel="noreferrer" className="hover:underline text-[var(--text-muted)]">GitHub Repo</a></div>
            <div><a href="https://bullmq.io" target="_blank" rel="noreferrer" className="hover:underline text-[var(--text-muted)]">BullMQ</a></div>
            <div><a href="https://fastify.dev" target="_blank" rel="noreferrer" className="hover:underline text-[var(--text-muted)]">Fastify</a></div>
          </div>

          <div className="space-y-2.5 col-span-2 sm:col-span-1">
            <div className="font-bold uppercase tracking-wider text-[11px]" style={{ color: "var(--text-faint)" }}>Community</div>
            <div className="flex items-center gap-3 pt-1">
              <a href="https://github.com/byte-curious/JobFailure_Inspector" target="_blank" rel="noreferrer" className="p-2 rounded-lg border hover:opacity-80 transition" style={{ borderColor: "var(--border)" }}>
                <GitBranch className="w-4 h-4" />
              </a>
              <a href="https://discord.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg border hover:opacity-80 transition" style={{ borderColor: "var(--border)" }}>
                <MessageSquare className="w-4 h-4 text-purple-400" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* VIDYST-STYLE GIANT BACKGROUND WATERMARK */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[120px] sm:text-[160px] md:text-[200px] font-black tracking-tighter select-none pointer-events-none opacity-[0.03] uppercase font-sans whitespace-nowrap"
        style={{ color: "var(--text)" }}
      >
        JobInspector
      </div>
    </footer>
  );
};
