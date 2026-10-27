import React from "react";
import { CheckCircle2, EyeOff, RotateCcw } from "lucide-react";
import { useToast } from "../Toast";

type BulkActionBarProps = {
    selectedCount: number;
    onClearSelection: () => void;
};

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedCount,
    onClearSelection,
}) => {
    const { showToast } = useToast();

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-floating px-5 py-2.5 rounded-2xl flex items-center gap-4 z-50 animate-fade-in">
            <div className="flex items-center gap-2">
                <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: "rgba(127, 75, 245, 0.2)", color: "var(--accent)" }}
                >
                    {selectedCount} Selected
                </span>
                <button
                    onClick={onClearSelection}
                    className="text-[11px] font-mono underline opacity-70 hover:opacity-100"
                    style={{ color: "var(--text-muted)" }}
                >
                    Deselect
                </button>
            </div>

            <div className="h-4 w-px border-l" style={{ borderColor: "var(--border)" }} />

            <div className="flex items-center gap-2">
                <button
                    onClick={() => {
                        showToast(`${selectedCount} jobs marked as Resolved`);
                        onClearSelection();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition shadow-sm"
                    style={{ backgroundColor: "var(--accent)" }}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                </button>

                <button
                    onClick={() => {
                        showToast(`${selectedCount} jobs Muted/Ignored`);
                        onClearSelection();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                    style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface)",
                        color: "var(--text)",
                    }}
                >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ignore</span>
                </button>

                <button
                    onClick={() => {
                        showToast(`${selectedCount} jobs re-enqueued to Redis`);
                        onClearSelection();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                    style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface)",
                        color: "var(--text)",
                    }}
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-enqueue</span>
                </button>
            </div>
        </div>
    );
};
