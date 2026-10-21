import crypto from "node:crypto";
import { prisma } from "../database/db.js";
import type { FastifyPluginAsync } from "fastify";

type ErrorPayload = {
    name: string;
    message: string;
    stack?: string;
};

type FailureReportBody = {
    queueName: string;
    jobId: string;
    attemptNumber: number;
    payload?: unknown;
    durationMs: number;
    error: ErrorPayload;
    breadcrumbs?: unknown[];
    failedAt?: string;
};

export async function recordFailure(report: FailureReportBody) {
    const { queueName, jobId, attemptNumber, payload, durationMs, error } = report;

    // Deterministic fingerprint: hash error name + message
    const errorFingerprint = crypto
        .createHash("sha256")
        .update(`${error.name}:${error.message}`)
        .digest("hex");

    // 1. Upsert parent Job using the compound unique key
    const job = await prisma.job.upsert({
        where: {
            queueName_externalJobId: {
                queueName,
                externalJobId: jobId,
            },
        },
        create: {
            queueName,
            externalJobId: jobId,
            lastErrorFingerprint: errorFingerprint,
            status: "FAILED",
            totalAttempts: attemptNumber,
        },
        update: {
            lastErrorFingerprint: errorFingerprint,
            status: "FAILED",
            totalAttempts: attemptNumber,
        },
    });

    // 2. Insert child attempt linked to job.id (UUID)
    const attempt = await prisma.jobAttempts.create({
        data: {
            jobId: job.id,
            attemptNumber,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            errorFingerprint,
            payload: (payload as object) ?? {},
            duration: durationMs,
            breadcrumbs: (report.breadcrumbs as object )?? [],
            failedAt: report.failedAt ? new Date(report.failedAt) : new Date(),
        },
    });

    return { job, attempt };
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
                        error: {
                            type: "object",
                            required: ["name", "message"],
                            properties: {
                                name: { type: "string" },
                                message: { type: "string" },
                                stack: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const result = await recordFailure(request.body);

                return reply.code(201).send({
                    received: true,
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
