import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/database/db.js";
import { runRetentionSweep } from "../src/services/retention.js";

describe("Tiered Retention Engine", () => {
    const testQueue = "retention-test-queue";

    async function cleanup() {
        await prisma.job.deleteMany({
            where: { queueName: testQueue },
        });
    }

    before(cleanup);
    after(cleanup);

    it("should handle Hot, Warm, and Cold tiers accurately", async () => {
        const now = Date.now();
        const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);   // Hot (Keep full)
        const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);  // Warm (Strip JSON)
        const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000); // Cold (Delete completely)

        // 1. Create a Hot Job (2 days old)
        const hotJob = await prisma.job.create({
            data: { queueName: testQueue, externalJobId: "job_hot", status: "FAILED", createdAt: twoDaysAgo, updatedAt: twoDaysAgo },
        });
        const hotAttempt = await prisma.jobAttempts.create({
            data: {
                jobId: hotJob.id,
                attemptNumber: 1,
                errorName: "Error",
                errorMessage: "Recent crash",
                errorFingerprint: "fp_hot",
                payload: { orderId: "123" },
                breadcrumbs: [{ message: "Step 1" }],
                failedAt: twoDaysAgo,
            },
        });

        // 2. Create a Warm Job (10 days old)
        const warmJob = await prisma.job.create({
            data: { queueName: testQueue, externalJobId: "job_warm", status: "FAILED", createdAt: tenDaysAgo, updatedAt: tenDaysAgo },
        });
        const warmAttempt = await prisma.jobAttempts.create({
            data: {
                jobId: warmJob.id,
                attemptNumber: 1,
                errorName: "Error",
                errorMessage: "Older crash",
                errorFingerprint: "fp_warm",
                payload: { orderId: "456" },
                breadcrumbs: [{ message: "Step 1" }],
                failedAt: tenDaysAgo,
            },
        });

        // 3. Create a Cold Job (40 days old)
        const coldJob = await prisma.job.create({
            data: { queueName: testQueue, externalJobId: "job_cold", status: "FAILED", createdAt: fortyDaysAgo, updatedAt: fortyDaysAgo },
        });
        await prisma.jobAttempts.create({
            data: {
                jobId: coldJob.id,
                attemptNumber: 1,
                errorName: "Error",
                errorMessage: "Ancient crash",
                errorFingerprint: "fp_cold",
                payload: { orderId: "789" },
                breadcrumbs: [{ message: "Step 1" }],
                failedAt: fortyDaysAgo,
            },
        });

        // Run the sweep: warmDays = 7, coldDays = 30
        const result = await runRetentionSweep(7, 30, 100);

        assert.equal(result.warmStrippedCount >= 1, true, "Should strip at least 1 warm attempt");
        assert.equal(result.coldDeletedAttempts >= 1, true, "Should delete at least 1 cold attempt");
        assert.equal(result.orphanJobsDeleted >= 1, true, "Should delete the cold orphan job");

        // VERIFY HOT TIER (Untouched)
        const hotCheck = await prisma.jobAttempts.findUniqueOrThrow({ where: { id: hotAttempt.id } });
        assert.notEqual(hotCheck.payload, null, "Hot payload must remain intact");
        assert.notEqual(hotCheck.breadcrumbs, null, "Hot breadcrumbs must remain intact");

        // VERIFY WARM TIER (Row exists, but JSON stripped)
        const warmCheck = await prisma.jobAttempts.findUniqueOrThrow({ where: { id: warmAttempt.id } });
        assert.equal(warmCheck.payload, null, "Warm payload must be null");
        assert.equal(warmCheck.breadcrumbs, null, "Warm breadcrumbs must be null");
        assert.equal(warmCheck.errorMessage, "Older crash", "Warm error metadata must be preserved!");

        // VERIFY COLD TIER (Completely purged)
        const coldCheck = await prisma.job.findUnique({ where: { id: coldJob.id } });
        assert.equal(coldCheck, null, "Cold job and its attempts must be completely removed");
    });
});
