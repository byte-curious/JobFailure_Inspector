import { useState } from "react";
import { Navigation, type PageId } from "./components/Navigation";
import { TopBar } from "./components/TopBar";
import { ToastProvider } from "./components/Toast";
import { useLiveStream } from "./api/useLiveStream";
import { IssuesFeed } from "./components/feed/IssuesFeed";
import { IssueDetail } from "./components/detail/IssueDetail";
import { QueueHealth } from "./components/health/QueueHealth";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("feed");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { isConnected } = useLiveStream();

  const handleSelectJob = (id: string) => {
    setSelectedJobId(id);
    setActivePage("detail");
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col md:flex-row w-full" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>

        {/* Left Navigation */}
        <Navigation activePage={activePage} onNavigate={setActivePage} />

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar activePage={activePage} selectedJobId={selectedJobId} isConnected={isConnected} />

          <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full">
            {activePage === "feed" && (
              <IssuesFeed onSelectJob={handleSelectJob} />
            )}


            {activePage === "detail" && (
              selectedJobId ? (
                <IssueDetail jobId={selectedJobId} onBack={() => setActivePage("feed")} />
              ) : (
                <div className="glass-panel p-12 text-center rounded-2xl max-w-md mx-auto my-12 space-y-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-purple-400 bg-purple-500/10 border border-purple-500/20">
                    ⚡
                  </div>
                  <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>No Issue Selected</h2>
                  <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Select a failed background job from the Issues Stream to inspect its full forensic autopsy.
                  </p>
                  <button
                    onClick={() => setActivePage("feed")}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    Open Issues Stream
                  </button>
                </div>
              )
            )}
            {activePage === "health" && <QueueHealth />}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
