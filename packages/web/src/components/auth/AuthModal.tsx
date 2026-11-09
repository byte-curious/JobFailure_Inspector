import { useState } from "react";
import { X, Lock, Mail, ArrowRight, User as UserIcon } from "lucide-react";
import { useToast } from "../Toast";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any, project: any) => void;
};

export const AuthModal = ({ isOpen, onClose, onLoginSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = mode === "signup" ? "/v1/auth/signup" : "/v1/auth/login";
    const body =
      mode === "signup"
        ? { email, password, name, projectName }
        : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Authentication failed");
        return;
      }

      localStorage.setItem("inspector_token", data.token);

      const activeProj = data.project || (data.projects && data.projects[0]);
      onLoginSuccess(data.token, data.user, activeProj);
      showToast(`Welcome ${data.user.name || data.user.email}!`);
      onClose();
    } catch {
      showToast("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: "github" | "google") => {
    window.location.href = `/v1/auth/${provider}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-5"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg border transition hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: "var(--accent)" }}>
              ⚡
            </span>
            <span className="font-bold text-base font-sans" style={{ color: "var(--text)" }}>
              Job<span className="font-editorial text-lg ml-0.5" style={{ color: "var(--accent)" }}>Inspector</span>
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight font-sans" style={{ color: "var(--text)" }}>
            {mode === "login" ? "Sign in to your workspace" : "Create your developer account"}
          </h2>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {mode === "login"
              ? "Monitor your background queues and triage failures"
              : "Get your private API key and connect your workers in 2 minutes"}
          </p>
        </div>

        {/* Social OAuth Buttons with Native SVG Logos */}
        <div className="space-y-2.5">
          {/* GitHub SVG */}
          <button
            onClick={() => handleOAuth("github")}
            className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2.5 text-xs font-mono font-medium transition hover:opacity-85 shadow-xs"
            style={{ backgroundColor: "#24292e", borderColor: "#2f363d", color: "#ffffff" }}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          {/* Google SVG */}
          <button
            onClick={() => handleOAuth("google")}
            className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2.5 text-xs font-mono font-medium transition hover:opacity-85 shadow-xs"
            style={{ backgroundColor: "var(--surface-hover)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px border-b" style={{ borderColor: "var(--border)" }} />
          <span className="text-[11px] font-mono uppercase" style={{ color: "var(--text-faint)" }}>or continue with email</span>
          <div className="flex-1 h-px border-b" style={{ borderColor: "var(--border)" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs font-mono font-medium" style={{ color: "var(--text-muted)" }}>Your Name</label>
                <div className="relative mt-1">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-mono pl-9 pr-3 py-2 rounded-lg border focus:outline-none"
                    style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-medium" style={{ color: "var(--text-muted)" }}>Project / Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="Acme Production"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border mt-1 focus:outline-none"
                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-mono font-medium" style={{ color: "var(--text-muted)" }}>Email Address</label>
            <div className="relative mt-1">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
              <input
                type="email"
                required
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs font-mono pl-9 pr-3 py-2 rounded-lg border focus:outline-none"
                style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono font-medium" style={{ color: "var(--text-muted)" }}>Password</label>
            <div className="relative mt-1">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs font-mono pl-9 pr-3 py-2 rounded-lg border focus:outline-none"
                style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <span>{loading ? "Authenticating..." : mode === "login" ? "Sign in to Dashboard" : "Create Account & API Key"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-center pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          {mode === "login" ? (
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              Don't have an account?{" "}
              <button onClick={() => setMode("signup")} className="text-purple-400 font-bold hover:underline">
                Sign up free
              </button>
            </p>
          ) : (
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="text-purple-400 font-bold hover:underline">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
