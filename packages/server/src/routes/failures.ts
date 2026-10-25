import { prisma } from "../database/db.js";
import type { FastifyPluginAsync } from "fastify";
import { generateErrorFingerprint } from "../utils/normalize.js";

type ErrorPayload = {
    name: string;
    message: string;
    stack?: string;
    code?: string;  
};

type FailureReportBody = {
    queueName: string;
    jobId: string;
    attemptNumber: number;
    payload?: unknown;
    durationMs: number;
    error: ErrorPayload;
    breadcrumbs?: unknown[];
    droppedBreadcrumbs?: number; 
    failedAt?: string;
};

export async function recordFailure(report: FailureReportBody) {
    const {
        queueName,
        jobId,
        attemptNumber,
        payload,
        durationMs,
        error,
        droppedBreadcrumbs,
        breadcrumbs,
        failedAt,
    } = report;

    // 1. Generate normalized fingerprint using name + code + message
    const errorFingerprint = generateErrorFingerprint({
        name: error.name,
        message: error.message,
        code: error.code,
    });

    // 2. Execute atomically inside an interactive transaction
    return await prisma.$transaction(async (tx) => {
        // Step A: Find existing parent job to ensure monotonic updates
        const existingJob = await tx.job.findUnique({
            where: {
                queueName_externalJobId: {
                    queueName,
                    externalJobId: jobId,
                },
            },
        });

        let job;
        if (!existingJob) {
            // Brand-new job
            job = await tx.job.create({
                data: {
                    queueName,
                    externalJobId: jobId,
                    lastErrorFingerprint: errorFingerprint,
                    status: "FAILED",
                    totalAttempts: attemptNumber,
                },
            });
        } else {
            // Existing job: update monotonically!
            const isLatestAttempt = attemptNumber >= existingJob.totalAttempts;
            job = await tx.job.update({
                where: { id: existingJob.id },
                data: {
                    // Never downgrade totalAttempts
                    totalAttempts: Math.max(existingJob.totalAttempts, attemptNumber),
                    // Only update fingerprint if this attempt is >= current latest
                    lastErrorFingerprint: isLatestAttempt
                        ? errorFingerprint
                        : existingJob.lastErrorFingerprint,
                    status: "FAILED",
                },
            });
        }

        // Step B: Idempotency check on JobAttempt
        const existingAttempt = await tx.jobAttempts.findUnique({
            where: {
                jobId_attemptNumber: {
                    jobId: job.id,
                    attemptNumber,
                },
            },
        });

        if (existingAttempt) {
            // Already received! Do not overwrite; return duplicate flag
            return { job, attempt: existingAttempt, isDuplicate: true };
        }

        // Step C: Create new attempt record
        const attempt = await tx.jobAttempts.create({
            data: {
                jobId: job.id,
                attemptNumber,
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
                errorFingerprint,
                payload: (payload as object) ?? {},
                duration: durationMs,
                breadcrumbs: (breadcrumbs as object) ?? [],
                droppedBreadcrumbs: droppedBreadcrumbs ?? null,
                failedAt: failedAt ? new Date(failedAt) : new Date(),
            },
        });

        return { job, attempt, isDuplicate: false };
    });
}

export const failureRoute: FastifyPluginAsync = async (fastify) => {
    fastify.post<{ Body: FailureReportBody }>(
        "/v1/events/failure",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["queueName", "jobId", "attemptNumber", "durationMs", "error"],
                    properties: {
                        queueName: { type: "string" },
                        jobId: { type: "string" },
                        attemptNumber: { type: "integer" },
                        durationMs: { type: "number" },
                        payload: { type: "object" },
                        droppedBreadcrumbs: { type: "number" },
                        error: {
                            type: "object",
                            required: ["name", "message"],
                            properties: {
                                name: { type: "string" },
                                message: { type: "string" },
                                stack: { type: "string" },
                                code: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const result = await recordFailure(request.body);
                const statusCode = result.isDuplicate ? 200 : 201;

                return reply.code(statusCode).send({
                    received: true,
                    duplicate: result.isDuplicate,
                    jobId: result.job.id,
                    attemptId: result.attempt.id,
                });
            } catch (error) {
                fastify.log.error({ err: error }, "Failed to record failure");

                return reply.code(500).send({
                    error: "INTERNAL_SERVER_ERROR",
                    message: "Failed to record failure report",
                });
            }
        }
    );
};
