import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { prisma } from "../src/database/db.js";
import { inspectorRoutes } from "../src/routes/inspector.js";

describe("Dynamic Service Topology & Multi-Queue Health", () => {
    const server = Fastify();

    before(async () => {
        server.register(inspectorRoutes);
        await server.ready();

        // Clean up test data
        await prisma.incident.deleteMany({
            where: { queueName: { startsWith: "topo-test-" } },
        });
        await prisma.job.deleteMany({
            where: { queueName: { startsWith: "topo-test-" } },
        });
    });

    after(async () => {
        await prisma.incident.deleteMany({
            where: { queueName: { startsWith: "topo-test-" } },
        });
        await prisma.job.deleteMany({
            where: { queueName: { startsWith: "topo-test-" } },
        });
        await server.close();
    });

    it("should dynamically return DEGRADED (Pulsing Red) when an incident is OPEN", async () => {
        const queueName = "topo-test-failing";

        // 1. Create an active OPEN incident
        const incident = await prisma.incident.create({
            data: {
                queueName,
                errorFingerprint: "fp_degraded_test",
                status: "OPEN",
                eventCount: 5,
            },
        });

        // Create a corresponding job
        await prisma.job.create({
            data: {
                queueName,
                externalJobId: "job_topo_1",
                status: "FAILED",
            },
        });

        // 2. Fetch live diagnostics endpoint
        const res = await server.inject({
            method: "GET",
            url: "/v1/system/diagnostics",
        });

        assert.equal(res.statusCode, 200);
        const body = res.json();
        const failingQueue = body.topology.queues.find((q: any) => q.name === queueName);

        assert.ok(failingQueue, "Queue must be dynamically discovered from database");
        assert.equal(failingQueue.status, "DEGRADED", "Active incident MUST flag queue as DEGRADED (Red in UI!)");
        assert.equal(failingQueue.failuresCount, 1);

        // 3. Mark incident as RESOLVED and verify it flips back to HEALTHY (Green!)
        await prisma.incident.update({
            where: { id: incident.id },
            data: { status: "RESOLVED" },
        });

        const resAfterResolve = await server.inject({
            method: "GET",
            url: "/v1/system/diagnostics",
        });

        const resolvedQueue = resAfterResolve.json().topology.queues.find((q: any) => q.name === queueName);
        assert.equal(resolvedQueue.status, "HEALTHY", "Resolved incident MUST flip queue back to HEALTHY (Green in UI!)");
    });

    it("should accurately isolate multiple queues (5 concurrent queues)", async () => {
        const queues = [
            { name: "topo-test-orders", hasOpenIncident: true },
            { name: "topo-test-billing", hasOpenIncident: true },
            { name: "topo-test-emails", hasOpenIncident: false },
            { name: "topo-test-webhooks", hasOpenIncident: false },
            { name: "topo-test-analytics", hasOpenIncident: false },
        ];

        // Seed 5 different queues
        for (const q of queues) {
            await prisma.job.create({
                data: { queueName: q.name, externalJobId: `job_${q.name}`, status: "FAILED" },
            });

            if (q.hasOpenIncident) {
                await prisma.incident.create({
                    data: { queueName: q.name, errorFingerprint: `fp_${q.name}`, status: "OPEN" },
                });
            }
        }

        const res = await server.inject({
            method: "GET",
            url: "/v1/system/diagnostics",
        });

        const body = res.json();
        const returnedQueues = body.topology.queues;

        // Verify each queue status matches its exact database health
        for (const q of queues) {
            const found = returnedQueues.find((rq: any) => rq.name === q.name);
            assert.ok(found, `Queue ${q.name} must be dynamically present`);
            const expectedStatus = q.hasOpenIncident ? "DEGRADED" : "HEALTHY";
            assert.equal(found.status, expectedStatus, `Queue ${q.name} status must be ${expectedStatus}`);
        }
    });
});
