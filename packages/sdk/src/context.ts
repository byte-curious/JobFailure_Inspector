import { RingBuffer } from "./ring-buffer.js";
import { AsyncLocalStorage } from "node:async_hooks";

export type BreadcrumbCategory = "checkpoint" | "http" | "db" | "log";

export type Breadcrumb = {
    category: BreadcrumbCategory;
    timestamp: number;
    message: string;
    data?: Record<string, unknown>;
};

export type JobContext = {
    jobId: string;
    queueName: string;
    breadcrumbs: RingBuffer<Breadcrumb>;
};

export const executionContext = new AsyncLocalStorage<JobContext>();

/**
 * Internal helper to record any breadcrumb into the active job's ring buffer.
 * If called outside of a wrapped job, it fails silently without crashing.
 */
export function addBreadcrumb(
    category: BreadcrumbCategory,
    message: string,
    data?: Record<string, unknown>
): void {
    const store = executionContext.getStore();
    if (!store) return; // Silent no-op if outside worker context

    store.breadcrumbs.push({
        category,
        message,
        timestamp: Date.now(),
        data,
    });
}

/**
 * Public API for developers to add manual checkpoints in their worker.
 * Example: inspector.checkpoint("Validating user credit balance", { userId: 123 });
 */
export const inspector = {
    checkpoint(message: string, data?: Record<string, unknown>): void {
        addBreadcrumb("checkpoint", message, data);
    },
};
