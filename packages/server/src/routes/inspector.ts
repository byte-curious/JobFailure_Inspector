import type { FastifyPluginAsync } from "fastify";
import { classifyAttempt } from "../services/classifier.js";
import { eventBus } from "../utils/event-bus.js";
import { prisma } from "../database/db.js";
import type { JobStatus } from "../generated/prisma/enums.js";
import { computeExecutionDiff } from "../services/diff.js";
import { Prisma } from "../generated/prisma/client.js";

type JobsQuery = {
    queue?: string;
    status?: JobStatus;
    page?: number;
    limit?: number;
};

// 60-second TTL cache for available queues to avoid repeated database scans
let cachedQueues: { names: string[]; expiresAt: number } | null = null;
async function getCachedQueues(): Promise<string[]> {
    const now = Date.now();
    if (cachedQueues && cachedQueues.expiresAt > now) {
        return cachedQueues.names;
    }
    const rows = await prisma.job.findMany({
        select: { queueName: true },
        distinct: ["queueName"],
    });
    const names = rows.map((r) => r.queueName);
    cachedQueues = { names, expiresAt: now + 60_000 };
    return names;
}

export const inspectorRoutes: FastifyPluginAsync = async (fastify) => {

    //  1. GET /v1/jobs (Paginated List with Filters)
    fastify.get<{ Querystring: JobsQuery }>(
        "/v1/jobs",
        {
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        queue: { type: "string" },
                        status: { type: "string", enum: ["FAILED", "DEAD_LETTER", "RESOLVED"] },
                        page: { type: "integer", minimum: 1, default: 1 },
                        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                },
            },
        },
        async (request, reply) => {
            const page = request.query.page ?? 1;
            const limit = request.query.limit ?? 20;

            const skip = (page - 1) * limit;

            const where = {
                ...(request.query.queue ? { queueName: request.query.queue } : {}),
                ...(request.query.status ? { status: request.query.status } : {}),
            };

            const [jobs, totalCnt, queues] = await Promise.all([
                prisma.job.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { updatedAt: "desc" },
                    include: {
                        attempts: {
                            orderBy: { attemptNumber: "desc" },
                            take: 1, // only fetch the lastest attempt for list view
                            select: {
                                attemptNumber: true,
                                errorMessage: true,
                                errorName: true,
                                failedAt: true,
                                duration: true,
                            },
                        },
                    },
                }),
                prisma.job.count({ where }),
                getCachedQueues(),
            ]);

            return reply.send({
                data: jobs.map((j) => ({
                    id: j.id,
                    externalJobId: j.externalJobId,
                    queueName: j.queueName,
                    status: j.status,
                    totalAttempts: j.totalAttempts,
                    updatedAt: j.updatedAt,
                    latestAttempt: j.attempts[0] ?? null,
                })),
                pagination: {
                    totalCount: totalCnt,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCnt / limit),
                },
                availableQueues: queues,
            });
        }
    );

    // 2. GET /v1/jobs/:id (Full Details + Dynamic Diff + Blast Radius)
    fastify.get<{ Params: { id: string } }>("/v1/jobs/:id", async (request, reply) => {
        const job = await prisma.job.findUnique({
            where: {
                id: request.params.id,
            },
            include: {
                attempts: {
                    orderBy: { attemptNumber: "asc" },
                },
            },
        });

        if (!job) {
            return reply.code(404).send({
                error: "NOT_FOUND",
                message: `Job with ID '${request.params.id}' not found.`,
            });
        }

        const latestAttempt = job.attempts[job.attempts.length - 1]; // latest comment as we above sort the arr acc to the attemmpt number
        const previousStoredAttempt = job.attempts.length > 1 ? job.attempts[job.attempts.length - 2] : null; // recent second attempt

        // now dynamically computer diff and classification on read
        const diff = latestAttempt ? computeExecutionDiff(latestAttempt, previousStoredAttempt) : null;

        const classification = latestAttempt
            ? await classifyAttempt(
                {
                    jobId: job.id,
                    attemptNumber: latestAttempt.attemptNumber,
                    errorFingerprint: latestAttempt.errorFingerprint,
                    failedAt: latestAttempt.failedAt,
                },
                job.queueName
            )
            : null;

        return reply.send({
            job: {
                id: job.id,
                externalJobId: job.externalJobId,
                queueName: job.queueName,
                status: job.status,
                totalAttempts: job.totalAttempts,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
            },
            attempts: job.attempts,
            diff,
            classification,
        });
    });

    //  3. GET : v1/events/stream (Live Server-Sent Event (SSE));
    fastify.get("/v1/events/stream", (request, reply) => {
        // set SSE header
        reply.hijack();

        const origin = process.env.CORS_ORIGIN || "*";
        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": origin,
        });

        // send immediate acknowledgement
        reply.raw.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

        // Send heartbeat ping every 20 seconds to prevent proxy timeouts
        const heartbeat = setInterval(() => {
            // heartbeat with socket write guard
            if (!reply.raw.writableEnded && reply.raw.writable) {
                try {
                    reply.raw.write(":ping\n\n");
                } catch {
                    clearInterval(heartbeat);
                }
            }
        }, 20000); // 20,000ms = 20 seconds

        // listener for failure events
        const listener = (eventData: unknown) => {
            if (!reply.raw.writableEnded && reply.raw.writable) {
                try {
                    reply.raw.write(`data: ${JSON.stringify({ type: "NEW_FAILURE", data: eventData })}\n\n`);
                } catch {
                    cleanup();
                }
            }
        };

        eventBus.on("new_failure", listener);

        function cleanup() {
            clearInterval(heartbeat);
            eventBus.off("new_failure", listener);
        }

        request.raw.on("close", cleanup);
    });

    // 4. GET /v1/system/health (Per-Queue Stats & 3-Tier Storage Breakdown)
    fastify.get("/v1/system/health", async (request, reply) => {
        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

        const [queues, totalJobs, hotCount, warmCount, hourlyBuckets] = await Promise.all([
            prisma.job.groupBy({
                by: ["queueName"],
                _count: { id: true },
            }),
            prisma.job.count(),
            prisma.jobAttempts.count({
                where: { failedAt: { gte: sevenDaysAgo } },
            }),
            prisma.jobAttempts.count({
                where: {
                    failedAt: { lt: sevenDaysAgo, gte: thirtyDaysAgo },
                    payload: { equals: Prisma.DbNull },
                },
            }),
            // REAL 24-HOUR HISTOGRAM (Grouped by hour from PostgreSQL)
            prisma.$queryRaw<Array<{ hour: string; count: bigint }>>`
                SELECT to_char(date_trunc('hour', failed_at), 'HH24:00') as hour, count(*)::int as count
                FROM job_attempts
                WHERE failed_at >= ${twentyFourHoursAgo}
                GROUP BY 1
                ORDER BY 1 ASC
            `,
        ]);

        return reply.send({
            totalQueues: queues.length,
            totalJobs,
            storageTiers: {
                hotTierCount: hotCount,
                warmTierCount: warmCount,
            },
            queues: queues.map((q) => ({
                name: q.queueName,
                failedJobsCount: q._count.id,
            })),
            hourlySpikes: hourlyBuckets.map((b) => ({
                hour: b.hour,
                count: Number(b.count),
            })),
        });
    });

    // 5. POST /v1/system/retention-sweep (Trigger Manual Storage Sweep)
    fastify.post("/v1/system/retention-sweep", async (request, reply) => {
        const { runRetentionSweep } = await import("../services/retention.js");
        const result = await runRetentionSweep(7, 30, 500);
        return reply.send({ success: true, result });
    });
    //  POST /v1/system/alerts/test (Send Live Test Webhook Notification)
    fastify.post<{ Body: { webhookUrl?: string } }>("/v1/system/alerts/test", async (request, reply) => {
        const targetUrl = request.body?.webhookUrl || process.env.WEBHOOK_URL;

        if (!targetUrl) {
            return reply.code(400).send({
                error: "NO_WEBHOOK_CONFIGURED",
                message: "No webhook URL configured. Pass 'webhookUrl' in body or set WEBHOOK_URL in environment.",
            });
        }

        const { formatSlackMessage, formatDiscordMessage } = await import("../services/outbox.js");

        let host = "webhook";
        try {
            host = new URL(targetUrl).hostname;
        } catch {
            return reply.code(400).send({ error: "INVALID_URL", message: "Invalid webhook URL." });
        }

        const testPayload = {
            event: "TEST_NOTIFICATION",
            queueName: "inspector-system",
            errorName: "VerificationSuccess",
            errorMessage: "Webhook delivery verified. Your JobInspector alert pipeline is operating normally.",
            reason: "Manual verification triggered from JobInspector Admin Console",
            timestamp: new Date().toISOString(),
            dashboardUrl: process.env.PUBLIC_URL || "http://localhost:3000",
        };

        const isSlack = host === "hooks.slack.com";
        const isDiscord = host.includes("discord.com") || host.includes("discordapp.com");
        const bodyPayload = isSlack
            ? formatSlackMessage(testPayload)
            : isDiscord
                ? formatDiscordMessage(testPayload)
                : testPayload;

        try {
            const res = await fetch(targetUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload),
                signal: AbortSignal.timeout(3000),
            });

            if (!res.ok) {
                const text = await res.text();
                return reply.code(res.status).send({
                    success: false,
                    message: `Rejected by ${host} (${res.status}): ${text.slice(0, 100)}`,
                });
            }

            return reply.send({ success: true, host, status: res.status });
        } catch (err) {
            return reply.code(500).send({ success: false, message: (err as Error).message });
        }
    });

    //  GET /v1/system/diagnostics  
    fastify.get("/v1/system/diagnostics", async (request, reply) => {
        const mem = process.memoryUsage();
        const startDb = Date.now();
        await prisma.$queryRaw`SELECT 1`; // Measure real DB latency!
        const dbLatencyMs = Date.now() - startDb;
        // console.log("👉 SERVER DATABASE_URL =", process.env.DATABASE_URL);
        const [queueGroups, openIncidents, pendingAlerts, deadAlerts] = await Promise.all([
            prisma.job.groupBy({
                by: ["queueName"],
                _count: { id: true },
            }),
            prisma.incident.findMany({
                where: { status: "OPEN" },
                select: { queueName: true, lastAlertKind: true },
            }),
            prisma.alertDelivery.count({ where: { status: "PENDING" } }),
            prisma.alertDelivery.count({ where: { status: "DEAD" } }),
        ]);

        const openQueueSet = new Set(openIncidents.map((i) => i.queueName));
        // console.log("DEBUG: openIncidents in DB =", openIncidents);
        // console.log("DEBUG: queueGroups in DB =", queueGroups);
        // Format dynamic queue nodes
        const queuesTopology = queueGroups.map((q) => {
            const hasIncident = openQueueSet.has(q.queueName);
            return {
                name: q.queueName,
                failuresCount: q._count.id,
                status: hasIncident ? "DEGRADED" : "HEALTHY",
            };
        });

        // If no jobs exist yet, provide a default demo queue so the map renders
        if (queuesTopology.length === 0) {
            queuesTopology.push({
                name: "default",
                failuresCount: 0,
                status: "HEALTHY",
            });
        }

        return reply.send({
            server: {
                uptimeSeconds: Math.floor(process.uptime()),
                nodeVersion: process.version,
                port: Number(process.env.PORT) || 3000,
                memory: {
                    rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
                    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
                },
            },
            database: {
                status: "HEALTHY",
                latencyMs: dbLatencyMs,
            },
            outbox: {
                status: "ACTIVE",
                pendingCount: pendingAlerts,
                deadCount: deadAlerts,
            },
            webhook: {
                isConfigured: Boolean(process.env.WEBHOOK_URL),
                host: process.env.WEBHOOK_URL ? new URL(process.env.WEBHOOK_URL).hostname : null,
            },
            topology: {
                queues: queuesTopology,
            },
        });
    });
    //  POST /v1/projects/webhook (Save Custom Project Webhook URL)
    fastify.post<{ Body: { webhookUrl: string; projectId?: string } }>("/v1/projects/webhook", async (request, reply) => {
        const { webhookUrl, projectId } = request.body;

        if (!webhookUrl || !webhookUrl.startsWith("http")) {
            return reply.code(400).send({ error: "INVALID_URL", message: "Please provide a valid HTTP/HTTPS webhook URL." });
        }

        // Find project (or fallback to default local project)
        let project = projectId
            ? await prisma.project.findUnique({ where: { id: projectId } })
            : await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });

        if (!project) {
            return reply.code(404).send({ error: "NOT_FOUND", message: "Project not found." });
        }

        // Save custom webhook to PostgreSQL!
        const updated = await prisma.project.update({
            where: { id: project.id },
            data: { webhookUrl: webhookUrl.trim() },
        });

        return reply.send({ success: true, webhookUrl: updated.webhookUrl });
    });

    //  GET /v1/jobs/:id/replay-bundle (Export Sanitized Replay Artifact)
    fastify.get<{ Params: { id: string } }>("/v1/jobs/:id/replay-bundle", async (request, reply) => {
        const job = await prisma.job.findUnique({
            where: { id: request.params.id },
            include: {
                attempts: {
                    orderBy: { attemptNumber: "desc" },
                    take: 1, // Latest attempt
                },
            },
        });

        if (!job || job.attempts.length === 0) {
            return reply.code(404).send({ error: "NOT_FOUND", message: "Job not found or has no attempts." });
        }

        const latestAttempt = job.attempts[0];

        // Extract recorded external HTTP fixtures from the breadcrumbs
        const httpFixtures = Array.isArray(latestAttempt.breadcrumbs)
            ? (latestAttempt.breadcrumbs as any[])
                  .filter((b) => b.category === "http" && b.data?.url)
                  .map((b) => ({
                      url: b.data.url,
                      method: b.data.method || "GET",
                      statusCode: b.data.statusCode || 200,
                      durationMs: b.data.durationMs || 0,
                  }))
            : [];

        // Construct the standardized .replay.json artifact bundle
        const replayBundle = {
            version: "1.0.0",
            exportedAt: new Date().toISOString(),
            job: {
                id: job.id,
                externalJobId: job.externalJobId,
                queueName: job.queueName,
                status: job.status,
                attemptNumber: latestAttempt.attemptNumber,
                totalAttempts: job.totalAttempts,
            },
            error: {
                name: latestAttempt.errorName,
                message: latestAttempt.errorMessage,
                stack: latestAttempt.errorStack,
                fingerprint: latestAttempt.errorFingerprint,
            },
            payload: latestAttempt.payload, // Sanitized input data
            httpFixtures,                   // Recorded external responses
            breadcrumbs: latestAttempt.breadcrumbs,
        };

        return reply.send(replayBundle);
    });
};
