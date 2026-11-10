import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/database/db.js";
import { classifyAttempt } from "../src/services/classifier.js";

describe("Failure Classifier Service", () => {
    const testQueue = "test-classifier-queue";
    const otherQueue = "unrelated-queue";
    const sharedFingerprint = "fp_shared_timeout_123";

    // Clean up test records before and after
    async function cleanup() {
        await prisma.job.deleteMany({
            where: { queueName: { in: [testQueue, otherQueue] } },
        });
    }

    before(cleanup);
    after(cleanup);

    it("should classify as SHARED_INCIDENT when distinct jobs in queue >= threshold", async () => {
        const now = new Date();

        // Create 3 distinct jobs in the same queue failing with the same fingerprint within 5 minutes
        for (let i = 1; i <= 3; i++) {
            const job = await prisma.job.create({
                data: {
                    queueName: testQueue,
                    externalJobId: `ext_job_${i}`,
                    status: "FAILED",
                },
            });

            await prisma.jobAttempts.create({
                data: {
                    jobId: job.id,
                    attemptNumber: 1,
                    errorName: "TimeoutError",
                    errorMessage: "Gateway timeout",
                    errorFingerprint: sharedFingerprint,
                    failedAt: now,
                },
            });
        }

        // Target attempt to classify (Job 3)
        const job3 = await prisma.job.findFirstOrThrow({
            where: { queueName: testQueue, externalJobId: "ext_job_3" },
        });

        const result = await classifyAttempt(
            { jobId: job3.id, attemptNumber: 1, errorFingerprint: sharedFingerprint, failedAt: now },
            testQueue,
            3 // Threshold
        );

        assert.equal(result.category, "SHARED_INCIDENT");
        assert.equal(result.evidence.distinctJobsInQueueCount, 3);
        assert.equal(result.evidence.isShared, true);
    });

    it("should NOT cluster across different queues (Queue Isolation)", async () => {
        const now = new Date();

        // Create a job in a completely different queue with the same fingerprint
        const otherJob = await prisma.job.create({
            data: { queueName: otherQueue, externalJobId: "other_1", status: "FAILED" },
        });
        await prisma.jobAttempts.create({
            data: {
                jobId: otherJob.id,
                attemptNumber: 1,
                errorName: "TimeoutError",
                errorMessage: "Gateway timeout",
                errorFingerprint: sharedFingerprint,
                failedAt: now,
            },
        });

        // Threshold is 3, but otherQueue only has 1 job
        const result = await classifyAttempt(
            { jobId: otherJob.id, attemptNumber: 1, errorFingerprint: sharedFingerprint, failedAt: now },
            otherQueue,
            3
        );

        assert.notEqual(result.category, "SHARED_INCIDENT", "Should not cluster with testQueue!");
        assert.equal(result.evidence.distinctJobsInQueueCount, 1);
    });

    it("should classify as REPEATED_SAME_ERROR if this job saw the same fingerprint earlier", async () => {
        const now = new Date();
        const singleQueue = "poison-pill-queue";
        const poisonFp = "fp_unique_poison_pill";

        const job = await prisma.job.create({
            data: { queueName: singleQueue, externalJobId: "poison_1", status: "FAILED" },
        });

        // Attempt 1: Failed with poisonFp
        await prisma.jobAttempts.create({
            data: {
                jobId: job.id,
                attemptNumber: 1,
                errorName: "ValidationError",
                errorMessage: "Invalid payload format",
                errorFingerprint: poisonFp,
                failedAt: new Date(now.getTime() - 2000),
            },
        });

        // Attempt 2: Failed with the exact same poisonFp
        const attempt2 = await prisma.jobAttempts.create({
            data: {
                jobId: job.id,
                attemptNumber: 2,
                errorName: "ValidationError",
                errorMessage: "Invalid payload format",
                errorFingerprint: poisonFp,
                failedAt: now,
            },
        });

        const result = await classifyAttempt(
            { jobId: job.id, attemptNumber: 2, errorFingerprint: poisonFp, failedAt: now },
            singleQueue,
            3
        );

        assert.equal(result.category, "REPEATED_SAME_ERROR");
        assert.equal(result.evidence.sameErrorSeenInPriorAttempt, true);
        assert.equal(result.evidence.isShared, false);

        await prisma.job.delete({ where: { id: job.id } });
    });
});
