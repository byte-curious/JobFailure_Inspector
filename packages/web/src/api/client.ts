import type { JobsResponse, JobDetailResponse } from "./types";

export async function fetchJobs(params: {
    queue?: string;
    status?: string;
    page?: number;
    limit?: number;
} = {}): Promise<JobsResponse> {
    const url = new URL("/v1/jobs", window.location.origin);
    if (params.queue && params.queue !== "all") url.searchParams.set("queue", params.queue);
    if (params.status && params.status !== "all") url.searchParams.set("status", params.status);
    if (params.page) url.searchParams.set("page", String(params.page));
    if (params.limit) url.searchParams.set("limit", String(params.limit));

    const res = await fetch(url.toString());
    if (!res.ok) {
        throw new Error(`Failed to fetch jobs (${res.status})`);
    }
    return res.json();
}

export async function fetchJobDetail(id: string): Promise<JobDetailResponse> {
    const res = await fetch(`/v1/jobs/${id}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch job detail (${res.status})`);
    }
    return res.json();
}
export type SystemHealthResponse = {
    totalQueues: number;
    totalJobs: number;
    storageTiers: {
        hotTierCount: number;
        warmTierCount: number;
    };
    queues: Array<{
        name: string;
        failedJobsCount: number;
    }>;
};

export async function fetchSystemHealth(): Promise<SystemHealthResponse> {
    const res = await fetch("/v1/system/health");
    if (!res.ok) throw new Error("Failed to fetch system health");
    return res.json();
}

export async function triggerRetentionSweep(): Promise<{ success: boolean; result: any }> {
    const res = await fetch("/v1/system/retention-sweep", { method: "POST" });
    if (!res.ok) throw new Error("Failed to trigger retention sweep");
    return res.json();
}
export async function sendTestWebhook(webhookUrl?: string): Promise<{ success: boolean; host: string }> {
    const res = await fetch("/v1/system/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to deliver test alert");
    }
    return res.json();
}

export async function fetchSystemDiagnostics(): Promise<any> {
    const res = await fetch("/v1/system/diagnostics");
    if (!res.ok) throw new Error("Failed to fetch diagnostics");
    return res.json();
}
