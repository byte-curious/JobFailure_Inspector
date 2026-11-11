import React from "react";
import { Terminal, Layout, Code2, ArrowRight } from "lucide-react";
import { useTheme } from "../../themes";

export const ToolPillars: React.FC<{ onOpenConsole: () => void }> = ({ onOpenConsole }) => {
  const { currentTheme } = useTheme();
  const isLightOrWarm = currentTheme === "light" || currentTheme === "warm";

  // High-contrast color tokens: Deep saturated colors on Light/Warm, glowing pastels on Dark!
  const cyanColor = isLightOrWarm ? "#0369a1" : "#38bdf8";
  const purpleColor = isLightOrWarm ? "#6d28d9" : "#c084fc";
  const roseColor = isLightOrWarm ? "#b91c1c" : "#fb7185";

  return (
    <section className="py-24 px-4 md:px-8 max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-sans" style={{ color: "var(--text)" }}>
          Three interfaces. <br />
          <span className="font-editorial text-purple-400 font-normal text-4xl sm:text-5xl">One unified engine.</span>
        </h2>
        <p className="text-sm md:text-base font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Whether you debug in VS Code, inspect in your terminal, or monitor in the browser, JobInspector fits your workflow.
        </p>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pillar 1: The Worker SDK */}
        <div
          className="glass-panel rounded-3xl p-7 space-y-5 landing-card-lift flex flex-col justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="space-y-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: isLightOrWarm ? "#e0f2fe" : "rgba(56, 189, 248, 0.1)",
                borderColor: isLightOrWarm ? "#bae6fd" : "rgba(56, 189, 248, 0.3)",
                color: cyanColor,
              }}
            >
              <Code2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono uppercase font-bold tracking-wider" style={{ color: cyanColor }}>
              01 • THE WORKER SDK
            </span>
            <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>@morpheus.live/sdk</h3>
            <p className="text-sm font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Wraps your BullMQ worker in 2 lines. Automatically intercepts outgoing <code className="font-mono text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>fetch()</code> calls, scrubs passwords in memory with a WeakSet, and maintains a bounded 50-item ring buffer.
            </p>
          </div>
          <div
            className="p-3 rounded-xl border font-mono text-xs font-semibold"
            style={{
              backgroundColor: isLightOrWarm ? "#f0f9ff" : "rgba(6, 182, 212, 0.05)",
              borderColor: isLightOrWarm ? "#bae6fd" : "rgba(6, 182, 212, 0.25)",
              color: cyanColor,
            }}
          >
            npm i @morpheus.live/sdk
          </div>
        </div>

        {/* Pillar 2: The Terminal CLI */}
        <div
          className="glass-panel rounded-3xl p-7 space-y-5 landing-card-lift flex flex-col justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="space-y-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: isLightOrWarm ? "#f3e8ff" : "rgba(127, 75, 245, 0.1)",
                borderColor: isLightOrWarm ? "#e9d5ff" : "rgba(127, 75, 245, 0.3)",
                color: purpleColor,
              }}
            >
              <Terminal className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono uppercase font-bold tracking-wider" style={{ color: purpleColor }}>
              02 • FOR TERMINAL LOVERS
            </span>
            <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>Terminal CLI</h3>
            <p className="text-sm font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
              List recent failures with high-density colored ASCII tables, export sanitized failure bundles (<code className="font-mono text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>.replay.json</code>), and replay crashes locally with network mocks.
            </p>
          </div>
          <div
            className="p-3 rounded-xl border font-mono text-xs font-semibold"
            style={{
              backgroundColor: isLightOrWarm ? "#faf5ff" : "rgba(127, 75, 245, 0.05)",
              borderColor: isLightOrWarm ? "#e9d5ff" : "rgba(127, 75, 245, 0.25)",
              color: purpleColor,
            }}
          >
            npx job-inspector list
          </div>
        </div>

        {/* Pillar 3: The Web Console */}
        <div
          className="glass-panel rounded-3xl p-7 space-y-5 landing-card-lift flex flex-col justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="space-y-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: isLightOrWarm ? "#ffe4e6" : "rgba(244, 63, 94, 0.1)",
                borderColor: isLightOrWarm ? "#fecdd3" : "rgba(244, 63, 94, 0.3)",
                color: roseColor,
              }}
            >
              <Layout className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono uppercase font-bold tracking-wider" style={{ color: roseColor }}>
              03 • VISUAL CONSOLE
            </span>
            <h3 className="text-xl font-bold font-sans" style={{ color: "var(--text)" }}>Sentry-Grade UI</h3>
            <p className="text-sm font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Real-time Server-Sent Events stream, side-by-side retry diff cards, 24-hour failure spikes histogram, and Dark, Light, and Claude Warm themes.
            </p>
          </div>
          <button
            onClick={onOpenConsole}
            className="flex items-center justify-between p-3 rounded-xl border font-mono text-xs font-bold hover:opacity-85 transition shadow-xs"
            style={{
              backgroundColor: isLightOrWarm ? "#fff1f2" : "rgba(244, 63, 94, 0.05)",
              borderColor: isLightOrWarm ? "#fecdd3" : "rgba(244, 63, 94, 0.25)",
              color: roseColor,
            }}
          >
            <span>Launch Live Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
