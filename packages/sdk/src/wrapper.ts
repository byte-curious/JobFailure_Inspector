// it will sit between the BullMQ and developer's worker code
// and notice is something went wrong?

import type { Job } from "bullmq";

type JobHandler<T, R> = (job: Job<T>) => Promise<R>;

type InspectorOptions = {
    ingestionUrl?: string;
    apiKey?: string;
};

type errorSerializer = {
    name: string,
    message: string,
    stack?: string
}

function serializationOfError(error: unknown): errorSerializer {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
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
    return async (job: Job<T>): Promise<R> => {
        // TODO 1: Record the start timestamp.
        const timer = Date.now();
        try {
            // TODO 2: Execute the developer's original handler.
            const result = await handler(job);

            // TODO 3: Return the result.
            return result;
        } catch (error: unknown) {
            // TODO 4: Calculate durationMs.
            const duration = Date.now() - timer;
            // TODO 5: Safely extract job metadata.
            //   const metadata = job.data // this only have the payload
            const metadata = {
                // queuename, jobId, attemptNumber, payload
                queueName: job.queueName,
                jobId: job.id ?? "unknown-job",
                attemptNumber: job.attemptsMade + 1,
                payload: job.data
            }
            // TODO 6: Safely serialize the error.
            // Why do we need to do serialization of error?
            // -> if we try to return JSON.stringfy(error) we get {} because 
            //      the important `Error` properties aren't enumerable. so we need to convert it into plain obj
            //   error serializer should produce a predictable object containing name,message, stack
            const serializedError = serializationOfError(error);

            // TODO 7: Send the failure event to your ingestion server.
            // IMPORTANT: Reporting failure must not hide the original error.
            const failureReport = {
                queueName: metadata.queueName,
                jobId: metadata.jobId,
                attemptNumber: metadata.attemptNumber,
                payload: metadata.payload,
                error: serializedError,
                durationMs: duration,
                failedAt: new Date().toISOString()
            }
            const ingestionUrl =
                options?.ingestionUrl ||
                process.env.INSPECTOR_INGESTION_URL ||
                "http://localhost:3000/v1/events/failure";

            // Fail-safe dispatch
            try {

                await fetch(ingestionUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(options?.apiKey ? { "Authorization": `Bearer ${options.apiKey}` } : {})
                    },
                    body: JSON.stringify(failureReport),
                    // Abort after 3 seconds so the worker is never held hostage
                    signal: AbortSignal.timeout(3000),
                });
            } catch (telemetryError) {
                // We warn the developer, but DO NOT prevent the original error from throwing
                console.warn(
                    `[JobInspector SDK] Failed to report job failure to ${ingestionUrl}:`,
                    telemetryError instanceof Error ? telemetryError.message : telemetryError
                );
            }
            // TODO 8: Re-throw the ORIGINAL error.
            throw error;
        }
    };
}
