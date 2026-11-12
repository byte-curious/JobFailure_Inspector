import { useEffect, useState } from "react";
import { Navigation, type PageId } from "./components/Navigation";
import { TopBar } from "./components/TopBar";
import { ToastProvider } from "./components/Toast";
import { useLiveStream } from "./api/useLiveStream";
import { IssuesFeed } from "./components/feed/IssuesFeed";
import { IssueDetail } from "./components/detail/IssueDetail";
import { QueueHealth } from "./components/health/QueueHealth";
import { AdminSettings } from "./components/admin/AdminSettings";
import { AuthModal } from "./components/auth/AuthModal";
import { LandingPage } from "./components/landing/LandingPage";
import { DocsPortal } from "./components/docs/DocsPortal";

export type ViewMode = "landing" | "docs" | "console";

// Detect initial page from browser URL path
function getInitialViewMode(): ViewMode {
  const path = window.location.pathname;
  if (path.startsWith("/docs")) return "docs";
  if (path.startsWith("/console") || path.startsWith("/main")) return "console";
  return "landing";
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [activePage, setActivePage] = useState<PageId>("feed");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Auth & Project State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);

  const { isConnected } = useLiveStream();

  // True Browser Path Navigation Helper (updates URL & browser history)
  const navigateTo = (mode: ViewMode) => {
    setViewMode(mode);
    const targetPath = mode === "landing" ? "/" : `/${mode}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ mode }, "", targetPath);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sync with browser Back and Forward buttons!
  useEffect(() => {
    const handlePopState = () => {
      setViewMode(getInitialViewMode());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Handle OAuth Token from redirect callback (?token=...)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get("token");

    if (oauthToken) {
      localStorage.setItem("inspector_token", oauthToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      navigateTo("console");
    }

    const token = localStorage.getItem("inspector_token");
    if (token) {
      fetch("/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            setActiveProject(data.projects[0] || null);
          }
        })
        .catch(() => { });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("inspector_token");
    setUser(null);
    setActiveProject(null);
  };

  const handleSelectJob = (id: string) => {
    setSelectedJobId(id);
    setActivePage("detail");
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col w-full" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>

        {viewMode === "landing" && (
          <LandingPage
            onOpenConsole={() => navigateTo("console")}
            onOpenDocs={() => navigateTo("docs")}
          />
        )}
        {viewMode === "docs" && (
          <DocsPortal
            onBackToLanding={() => navigateTo("landing")}
            onOpenConsole={() => navigateTo("console")}
          />
        )}

        {viewMode === "console" && (
          <div className="flex-1 flex flex-col md:flex-row w-full">
            {/* Left Rail Navigation */}
            <Navigation activePage={activePage} onNavigate={setActivePage} />

            <div className="flex-1 flex flex-col min-w-0">
              {/* Universal TopBar with Home Link in Logo */}
              <TopBar
                activePage={activePage}
                selectedJobId={selectedJobId}
                isConnected={isConnected}
                user={user}
                activeProject={activeProject}
                onOpenAuth={() => setIsAuthOpen(true)}
                onLogout={handleLogout}
              />

              <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full">
                {activePage === "feed" && <IssuesFeed onSelectJob={handleSelectJob} />}

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
                {activePage === "settings" && <AdminSettings activeProject={activeProject} />}
              </main>
            </div>
          </div>
        )}

      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(_token: string, u: any, p: any) => {
          setUser(u);
          setActiveProject(p);
          navigateTo("console");
        }}
      />
    </ToastProvider>
  );
}
