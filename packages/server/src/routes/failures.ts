import { prisma } from "../database/db.js";
import type { FastifyPluginAsync } from "fastify";
import { generateErrorFingerprint } from "../utils/normalize.js";
import { eventBus } from "../utils/event-bus.js";
import { decideAlert } from "../services/decideAlert.js";

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
    maxAttempts?: number;
    isFinalAttempt?: boolean;
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
        maxAttempts = 1,
        isFinalAttempt = false,
        payload,
        durationMs,
        error,
        droppedBreadcrumbs,
        breadcrumbs,
        failedAt,
    } = report;

    // 1. Generate normalized fingerprint
    const errorFingerprint = generateErrorFingerprint({
        name: error.name,
        message: error.message,
        code: error.code,
    });

    const now = new Date();
    const finalFailureInc = isFinalAttempt ? 1 : 0;
    const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";

    // 2. Single Atomic PostgreSQL Transaction
    return await prisma.$transaction(async (tx) => {
        // Upsert Parent Job  
        const existingJob = await tx.job.findUnique({
            where: {
                queueName_externalJobId: { queueName, externalJobId: jobId },
            },
        });

        let job;
        if (!existingJob) {
            job = await tx.job.create({
                data: {
                    queueName,
                    externalJobId: jobId,
                    lastErrorFingerprint: errorFingerprint,
                    status: isFinalAttempt ? "DEAD_LETTER" : "FAILED",
                    totalAttempts: attemptNumber,
                },
            });
        } else {
            const isLatestAttempt = attemptNumber >= existingJob.totalAttempts;
            job = await tx.job.update({
                where: { id: existingJob.id },
                data: {
                    totalAttempts: Math.max(existingJob.totalAttempts, attemptNumber),
                    lastErrorFingerprint: isLatestAttempt
                        ? errorFingerprint
                        : existingJob.lastErrorFingerprint,
                    status: isFinalAttempt ? "DEAD_LETTER" : "FAILED",
                },
            });
        }

        // Check Idempotency on Attempt
        const existingAttempt = await tx.jobAttempts.findUnique({
            where: {
                jobId_attemptNumber: { jobId: job.id, attemptNumber },
            },
        });

        if (existingAttempt) {
            // Already recorded, Return duplicate flag and skip incident increments
            return { job, attempt: existingAttempt, isDuplicate: true };
        }

        // Create new attempt
        const attempt = await tx.jobAttempts.create({
            data: {
                jobId: job.id,
                attemptNumber,
                maxAttempts,
                isFinalAttempt,
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
                errorFingerprint,
                payload: (payload as object) ?? {},
                duration: durationMs,
                breadcrumbs: (breadcrumbs as object) ?? [],
                droppedBreadcrumbs: droppedBreadcrumbs ?? null,
                failedAt: failedAt ? new Date(failedAt) : now,
            },
        });

        // Atomic Incident Upsert (Raw SQL)
        // Bumps epoch if previously RESOLVED
        const [incident] = await tx.$queryRaw<Array<{
            id: string;
            epoch: number;
            last_decided_epoch: number;
            last_sent_epoch: number;
            last_alert_kind: string | null;
            digest_seq: number;
            digest_final_count: number;
            final_failure_count: number;
            muted_until: Date | null;
            is_new: boolean;
        }>>`
            INSERT INTO incidents (
                id, queue_name, error_fingerprint, status, epoch,
                last_decided_epoch, last_sent_epoch, digest_seq, digest_final_count,
                event_count, final_failure_count, first_seen_at, last_seen_at
            ) VALUES (
                gen_random_uuid(), ${queueName}, ${errorFingerprint}, 'OPEN', 1,
                0, 0, 0, 0,
                1, ${finalFailureInc}, NOW(), NOW()
            )
            ON CONFLICT (queue_name, error_fingerprint) DO UPDATE SET
                epoch = CASE
                    WHEN incidents.status = 'RESOLVED' THEN incidents.epoch + 1
                    ELSE incidents.epoch
                END,
                status = 'OPEN',
                event_count = incidents.event_count + 1,
                final_failure_count = incidents.final_failure_count + ${finalFailureInc},
                last_seen_at = NOW()
            RETURNING 
                id, epoch, last_decided_epoch, last_sent_epoch, last_alert_kind,
                digest_seq, digest_final_count, final_failure_count, muted_until,
                (first_seen_at = last_seen_at) AS is_new;
        `;

        //  Upsert IncidentJob & Count Sliding Window
        await tx.$executeRaw`
            INSERT INTO incident_jobs (incident_id, job_id, last_seen_at)
            VALUES (${incident.id}, ${job.id}, NOW())
            ON CONFLICT (incident_id, job_id) DO UPDATE SET last_seen_at = NOW();
        `;

        const [{ distinctJobsCount }] = await tx.$queryRaw<[{ distinctJobsCount: number }]>`
            SELECT count(*)::int AS "distinctJobsCount"
            FROM incident_jobs
            WHERE incident_id = ${incident.id} AND last_seen_at >= NOW() - INTERVAL '5 minutes';
        `;

        // Count non-suppressed alerts created in last 1 hour across all queues (rate-cap guard)
        const [{ alertsLastHour }] = await tx.$queryRaw<[{ alertsLastHour: number }]>`
            SELECT count(*)::int AS "alertsLastHour"
            FROM alert_deliveries
            WHERE created_at >= NOW() - INTERVAL '1 hour' AND status != 'SUPPRESSED';
        `;

        // Pure Alert Decision Engine
        const decision = decideAlert({
            incident: {
                id: incident.id,
                epoch: incident.epoch,
                lastDecidedEpoch: incident.last_decided_epoch,
                lastSentEpoch: incident.last_sent_epoch,
                lastAlertKind: incident.last_alert_kind,
                digestSeq: incident.digest_seq,
                digestFinalCount: incident.digest_final_count,
                finalFailureCount: incident.final_failure_count,
                mutedUntil: incident.muted_until,
            },
            isNew: incident.is_new,
            distinctJobsInWindow: distinctJobsCount,
            threshold: 3,
            isFinalAttempt,
            alertsInLastHour: alertsLastHour,
            now,
        });

        //  Enqueue Alert into Outbox Table
        if (decision) {
            const alertPayload = {
                event: decision.kind,
                incidentId: incident.id,
                queueName,
                errorName: error.name,
                errorMessage: error.message,
                errorFingerprint,
                externalJobId: jobId,
                attemptNumber,
                maxAttempts,
                distinctJobsCount,
                reason: decision.reason,
                dashboardUrl: `${baseUrl}/v1/jobs/${job.id}`,
                timestamp: now.toISOString(),
            };

            const isSuppressed = decision.kind === "RATE_CAP_SUMMARY" ? false : alertsLastHour >= 20;

            await tx.$executeRaw`
                INSERT INTO alert_deliveries (
                    id, incident_id, epoch, dedupe_key, kind, payload, status, next_attempt_at, created_at
                ) VALUES (
                    gen_random_uuid(),
                    ${decision.kind === "RATE_CAP_SUMMARY" ? null : incident.id},
                    ${incident.epoch},
                    ${decision.dedupeKey},
                    ${decision.kind}::"AlertKind",
                    ${JSON.stringify(alertPayload)}::jsonb,
                    ${isSuppressed ? "SUPPRESSED" : "PENDING"}::"DeliveryStatus",
                    NOW(),
                    NOW()
                )
                ON CONFLICT (dedupe_key) DO NOTHING;
            `;

            // Update incident's decided tracking
            await tx.$executeRaw`
                UPDATE incidents
                SET last_decided_epoch = ${incident.epoch},
                    last_alert_kind = ${decision.kind}::"AlertKind"
                WHERE id = ${incident.id};
            `;
        }

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
                        maxAttempts: { type: "integer" },
                        isFinalAttempt: { type: "boolean" },
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

                // Broadcast live SSE to connected browser tabs if new
                if (!result.isDuplicate) {
                    eventBus.emitNewFailure({
                        jobId: result.job.id,
                        externalJobId: result.job.externalJobId,
                        queueName: result.job.queueName,
                        attemptNumber: result.attempt.attemptNumber,
                        errorName: result.attempt.errorName,
                        errorMessage: result.attempt.errorMessage,
                        failedAt: result.attempt.failedAt.toISOString(),
                    });
                }

                return reply.code(statusCode).send({
                    received: true,
                    duplicate: result.isDuplicate,
                    jobId: result.job.id,
                    attemptId: result.attempt.id,
                });
            } catch (error) {
                fastify.log.error({ err: error }, "Failed to record failure report");

                return reply.code(500).send({
                    error: "INTERNAL_SERVER_ERROR",
                    message: "Failed to record failure report",
                });
            }
        }
    );
};
