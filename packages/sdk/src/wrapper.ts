import type { Job } from "bullmq";
import { RingBuffer } from "./ring-buffer.js";
import { executionContext } from "./context.js";
import type { Breadcrumb, JobContext } from "./context.js";
import { enableHttpInterception } from "./interceptor/http.js";
import { sanitize } from "./sanitizer.js";


// Auto-enable HTTP interception once when SDK is imported
enableHttpInterception();

type JobHandler<T, R> = (job: Job<T>) => Promise<R>;

export type InspectorOptions = {
    ingestionUrl?: string;
    apiKey?: string;
};

type ErrorSerializer = {
    name: string;
    message: string;
    stack?: string;
    code?: string;
};

function serializationOfError(error: unknown): ErrorSerializer {
    if (error instanceof Error) {
        const rawErrorcode = (error as { code?: unknown }).code;
        const errorCode = (typeof rawErrorcode == "string" || typeof rawErrorcode == "number") ? String(rawErrorcode) : undefined;

        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: errorCode
        };
    }

    if (typeof error === "string") {
        return {
            name: "Error",
            message: error,
        };
    }

    return {
        name: "UnknownError",
        message: "An unknown error occurred.",
    };
}

export function wrapJob<T, R>(
    handler: JobHandler<T, R>,
    options?: InspectorOptions,
): JobHandler<T, R> {
    const ingestionUrl =
        options?.ingestionUrl ||
        process.env.INSPECTOR_INGESTION_URL ||
        "http://localhost:3000/v1/events/failure";

    return async (job: Job<T>): Promise<R> => {
        const timer = Date.now();

        // 1. Create a dedicated RingBuffer for this specific job execution
        const breadcrumbs = new RingBuffer<Breadcrumb>(50);

        const metadata = {
            queueName: job.queueName,
            jobId: job.id ?? "unknown-job",
            attemptNumber: job.attemptsMade + 1,
            payload: job.data,
        };

        // 2. Prepare the AsyncLocalStorage context
        const context: JobContext = {
            jobId: metadata.jobId,
            queueName: metadata.queueName,
            breadcrumbs,
        };

        try {
            // 3. Execute the handler INSIDE the context!
            // Anything called inside here can now use inspector.checkpoint()!
            return await executionContext.run(context, async () => {
                return await handler(job);
            });
        } catch (error: unknown) {
            const duration = Date.now() - timer;
            const serializedError = serializationOfError(error);
            //  Calculate BullMQ retry budget & unrecoverable error status
            const maxAttempts = typeof job.opts.attempts == "number" ? job.opts.attempts : 1;
            // server need to know the total allowed try budget
            const currentAttempt = job.attemptsMade + 1;
            // bullmq allows jobs to throw unrecoverable error to fail immediately without retrying
            const isUnrecoverable = error instanceof Error && (error.name === "UnrecoverableError" || (error as any).unrecoverable === true);

            const isFinalAttempt = isUnrecoverable || currentAttempt >= maxAttempts;

            // 4. Dump the breadcrumbs recorded in chronological order
            const failureReport = {
                queueName: metadata.queueName,
                jobId: metadata.jobId,
                attemptNumber: metadata.attemptNumber,
                payload: sanitize(metadata.payload),
                error: serializedError,
                durationMs: duration,
                maxAttempts,
                isFinalAttempt,
                breadcrumbs: sanitize(breadcrumbs.toArray()),
                droppedBreadcrumbs: breadcrumbs.droppedCount,
                failedAt: new Date().toISOString(),
            };

            // 5. Fail-safe dispatch to Ingestion Server
            try {
                await fetch(ingestionUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(options?.apiKey ? { "Authorization": `Bearer ${options.apiKey}` } : {}),
                    },
                    body: JSON.stringify(failureReport),
                    signal: AbortSignal.timeout(3000),
                });
            } catch (telemetryError) {

                console.warn(
                    `[JobInspector SDK] Failed to report job failure to ${ingestionUrl}:`,
                    telemetryError instanceof Error ? telemetryError.message : telemetryError
                );
            }

            // 6. Always re-throw the original error so BullMQ knows it failed
            throw error;
        }
    };
}
