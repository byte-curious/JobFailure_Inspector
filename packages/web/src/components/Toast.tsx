import React, { createContext, useContext, useState } from "react";
import { CheckCircle2 } from "lucide-react";

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastMessage && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-mono transition-all animate-bounce-short"
          style={{
            backgroundColor: "var(--surface-elevated)",
            borderColor: "var(--border)",
            color: "var(--text)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
          }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
