import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { prisma } from "../src/database/db.js";
import { inspectorRoutes } from "../src/routes/inspector.js";

describe("Replay Artifact Exporter (/v1/jobs/:id/replay-bundle)", () => {
    const server = Fastify();
    const queueName = "replay-test-queue";

    before(async () => {
        server.register(inspectorRoutes);
        await server.ready();

        await prisma.jobAttempts.deleteMany({ where: { job: { queueName } } });
        await prisma.job.deleteMany({ where: { queueName } });
    });

    after(async () => {
        await prisma.jobAttempts.deleteMany({ where: { job: { queueName } } });
        await prisma.job.deleteMany({ where: { queueName } });
        await server.close();
    });

    it("should export a standardized .replay.json artifact with fixtures", async () => {
        // 1. Create a job with an attempt containing an HTTP breadcrumb
        const job = await prisma.job.create({
            data: { queueName, externalJobId: "job_replay_101", status: "FAILED" },
        });

        await prisma.jobAttempts.create({
            data: {
                jobId: job.id,
                attemptNumber: 1,
                errorName: "StripeGatewayTimeout",
                errorMessage: "Connection timeout after 3000ms",
                errorFingerprint: "fp_replay_stripe_504",
                duration: 3120,
                payload: { orderId: "ord_99812", amount: 49.99 },
                breadcrumbs: [
                    { category: "checkpoint", message: "Starting payment" },
                    {
                        category: "http",
                        message: "POST https://api.stripe.com/charges [504]",
                        data: { url: "https://api.stripe.com/charges", method: "POST", statusCode: 504, durationMs: 3000 },
                    },
                ],
            },
        });

        // 2. Query the replay bundle endpoint
        const res = await server.inject({
            method: "GET",
            url: `/v1/jobs/${job.id}/replay-bundle`,
        });

        assert.equal(res.statusCode, 200);
        const bundle = res.json();

        // 3. Assert standardized artifact schema
        assert.equal(bundle.version, "1.0.0");
        assert.equal(bundle.job.externalJobId, "job_replay_101");
        assert.equal(bundle.error.name, "StripeGatewayTimeout");
        assert.equal(bundle.payload.orderId, "ord_99812");

        // Verify recorded HTTP fixtures are extracted for the mock runner!
        assert.equal(bundle.httpFixtures.length, 1);
        assert.equal(bundle.httpFixtures[0].url, "https://api.stripe.com/charges");
        assert.equal(bundle.httpFixtures[0].statusCode, 504);
    });

    it("should return 404 for non-existent job UUID", async () => {
        const res = await server.inject({
            method: "GET",
            url: `/v1/jobs/00000000-0000-0000-0000-000000000000/replay-bundle`,
        });

        assert.equal(res.statusCode, 404);
    });
});
