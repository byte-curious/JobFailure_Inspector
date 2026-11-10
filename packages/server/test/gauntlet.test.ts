import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/database/db.js";
import { recordFailure } from "../src/routes/failures.js";
import { computeExecutionDiff } from "../src/services/diff.js";
import { classifyAttempt } from "../src/services/classifier.js";
import { runRetentionSweep } from "../src/services/retention.js";

describe("Phase 3 Master Integration Gauntlet", () => {
    const queueName = "gauntlet-queue";

    async function cleanup() {
        await prisma.jobAttempts.deleteMany({
            where: { job: { queueName } },
        });
        await prisma.job.deleteMany({
            where: { queueName },
        });
    }

    before(cleanup);
    after(cleanup);

    // =========================================================================
    // 1. OUT-OF-ORDER INGESTION (MONOTONIC PARENT PROTECTION)
    // =========================================================================
    it("should protect parent Job metadata from out-of-order attempts", async () => {
        const jobId = "out_of_order_job";

        // Step A: Attempt 2 arrives FIRST!
        const result2 = await recordFailure({
            queueName,
            jobId,
            attemptNumber: 2,
            durationMs: 2500,
            error: { name: "ErrorB", message: "Second failure error" },
            droppedBreadcrumbs: 0,
            breadcrumbs: [{ message: "Step 1" }, { message: "Step 2" }],
        });

        assert.equal(result2.isDuplicate, false);
        const jobAfterAttempt2 = await prisma.job.findFirstOrThrow({
            where: { queueName, externalJobId: jobId },
        });
        assert.equal(jobAfterAttempt2.totalAttempts, 2);
        const fingerprintB = jobAfterAttempt2.lastErrorFingerprint;

        // Step B: Attempt 1 arrives LATE (network delay)
        const result1 = await recordFailure({
            queueName,
            jobId,
            attemptNumber: 1,
            durationMs: 1200,
            error: { name: "ErrorA", message: "First failure error" },
            droppedBreadcrumbs: 0,
            breadcrumbs: [{ message: "Step 1" }],
        });

        assert.equal(result1.isDuplicate, false);
        const jobAfterAttempt1 = await prisma.job.findFirstOrThrow({
            where: { queueName, externalJobId: jobId },
        });

        // ASSERTIONS: Monotonic protection
        assert.equal(jobAfterAttempt1.totalAttempts, 2, "totalAttempts must NOT be downgraded to 1!");
        assert.equal(jobAfterAttempt1.lastErrorFingerprint, fingerprintB, "Fingerprint must NOT be clobbered by older attempt!");
    });

    // =========================================================================
    // 2. IDEMPOTENCY & DUPLICATE ATTEMPT DELIVERY
    // =========================================================================
    it("should handle duplicate attempt delivery idempotently (200 OK vs 201 Created)", async () => {
        const jobId = "idempotent_job";

        // First delivery
        const first = await recordFailure({
            queueName,
            jobId,
            attemptNumber: 1,
            durationMs: 500,
            error: { name: "TimeoutError", message: "Gateway timeout" },
            breadcrumbs: [{ message: "Initial try" }],
        });
        assert.equal(first.isDuplicate, false, "First delivery must be brand new");

        // Duplicate delivery (retry by network)
        const duplicate = await recordFailure({
            queueName,
            jobId,
            attemptNumber: 1,
            durationMs: 100, // Even if duration differed
            error: { name: "TimeoutError", message: "Gateway timeout" },
            breadcrumbs: [],
        });
        assert.equal(duplicate.isDuplicate, true, "Second delivery must be marked as duplicate");

        // Verify database has exactly 1 attempt
        const count = await prisma.jobAttempts.count({
            where: { jobId: first.job.id, attemptNumber: 1 },
        });
        assert.equal(count, 1, "Database must not create duplicate attempt rows");
    });

    // =========================================================================
    // 3. ROOT CAUSE SHIFT ON RETRY (DIFF + CLASSIFIER WORKING TOGETHER)
    // =========================================================================
    it("should correlate retry diff and avoid false poison pill when root cause shifts", async () => {
        const jobId = "shifting_error_job";

        // Attempt 1: Failed on Stripe Timeout
        await recordFailure({
            queueName,
            jobId,
            attemptNumber: 1,
            durationMs: 3000,
            error: { name: "StripeTimeout", message: "Connection timeout to Stripe" },
            breadcrumbs: [{ category: "checkpoint", message: "Start checkout" }],
        });

        // Attempt 2: Failed on Database Unique Constraint
        const attempt2Report = await recordFailure({
            queueName,
            jobId,
            attemptNumber: 2,
            durationMs: 200,
            error: { name: "UniqueConstraintViolation", message: "duplicate key (SQLSTATE 23505)" },
            breadcrumbs: [{ category: "checkpoint", message: "Start checkout" }],
        });

        // Fetch both attempts from database
        const attempts = await prisma.jobAttempts.findMany({
            where: { jobId: attempt2Report.job.id },
            orderBy: { attemptNumber: "asc" },
        });

        // RUN DIFF: Attempt 1 vs Attempt 2
        const diff = computeExecutionDiff(attempts[1], attempts[0]);
        assert.equal(diff.hasBaseline, true);
        if (!diff.hasBaseline) return;

        assert.equal(diff.fingerprintChanged, true, "Diff engine must detect fingerprint shift");
        assert.equal(diff.durationDeltaMs, -2800, "Duration delta must reflect faster crash");

        // RUN CLASSIFIER on Attempt 2
        const classification = await classifyAttempt(attempts[1], queueName, 3);

        // Attempt 2's error did NOT happen on Attempt 1, so it must NOT be called a repeated error!
        assert.equal(classification.category, "ISOLATED_OR_NEW_ERROR");
        assert.equal(classification.evidence.sameErrorSeenInPriorAttempt, false);
    });

    // =========================================================================
    // 4. TIME-WINDOW EXPIRY IN CLASSIFIER (STALE ERRORS DON'T TRIGGER OUTAGE)
    // =========================================================================
    it("should not count errors outside the 5-minute window for SHARED_INCIDENT", async () => {
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        const staleFingerprint = "fp_stale_incident_test";

        // Job 1 & Job 2 failed 10 minutes ago
        for (let i = 1; i <= 2; i++) {
            const j = await prisma.job.create({
                data: { queueName, externalJobId: `stale_job_${i}`, status: "FAILED", createdAt: tenMinutesAgo, updatedAt: tenMinutesAgo },
            });
            await prisma.jobAttempts.create({
                data: { jobId: j.id, attemptNumber: 1, errorName: "Error", errorMessage: "Old crash", errorFingerprint: staleFingerprint, failedAt: tenMinutesAgo },
            });
        }

        // Job 3 fails NOW with the same fingerprint
        const currentJob = await prisma.job.create({
            data: { queueName, externalJobId: "fresh_job_3", status: "FAILED", createdAt: now, updatedAt: now },
        });
        const currentAttempt = await prisma.jobAttempts.create({
            data: { jobId: currentJob.id, attemptNumber: 1, errorName: "Error", errorMessage: "Fresh crash", errorFingerprint: staleFingerprint, failedAt: now },
        });

        // Run classifier with threshold = 3, window = 5 minutes
        const result = await classifyAttempt(currentAttempt, queueName, 3, 5);

        // Even though 3 jobs total have this error, only 1 is in the last 5 minutes!
        assert.equal(result.category, "ISOLATED_OR_NEW_ERROR", "Stale errors must not trigger SHARED_INCIDENT");
        assert.equal(result.evidence.distinctJobsInQueueCount, 1);
        assert.equal(result.evidence.isShared, false);
    });

    // =========================================================================
    // 5. WARM TIER RETENTION COMPATIBILITY WITH DIFF ENGINE
    // =========================================================================
    it("should gracefully diff against a Warm Tier pruned attempt without throwing", async () => {
        const jobId = "pruned_diff_job";
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        const now = new Date();

        // Ingest Attempt 1 (10 days old)
        const job = await prisma.job.create({
            data: { queueName, externalJobId: jobId, status: "FAILED", createdAt: tenDaysAgo, updatedAt: tenDaysAgo },
        });
        const attempt1 = await prisma.jobAttempts.create({
            data: {
                jobId: job.id,
                attemptNumber: 1,
                errorName: "Error",
                errorMessage: "Old crash",
                errorFingerprint: "fp_old",
                payload: { sensitive: "data" },
                breadcrumbs: [{ message: "Step 1" }],
                failedAt: tenDaysAgo,
            },
        });

        // Trigger Retention Sweep (warmDays = 7) -> Strips Attempt 1's payload and breadcrumbs to NULL
        await runRetentionSweep(7, 30, 100);

        // Verify Attempt 1 was pruned
        const prunedAttempt1 = await prisma.jobAttempts.findUniqueOrThrow({ where: { id: attempt1.id } });
        assert.equal(prunedAttempt1.breadcrumbs, null, "Breadcrumbs must be stripped to NULL");

        // Ingest Attempt 2 NOW
        const attempt2 = await prisma.jobAttempts.create({
            data: {
                jobId: job.id,
                attemptNumber: 2,
                errorName: "Error",
                errorMessage: "Recent crash",
                errorFingerprint: "fp_old",
                payload: { order: "new" },
                breadcrumbs: [{ message: "Step 1" }],
                failedAt: now,
            },
        });

        // Run Diff: Attempt 2 vs Pruned Attempt 1
        const diff = computeExecutionDiff(attempt2, prunedAttempt1);

        // MUST NOT CRASH! Must report scope: UNAVAILABLE with reason: no_breadcrumbs
        assert.equal(diff.hasBaseline, true);
        if (!diff.hasBaseline) return;

        assert.equal(diff.timeline.scope, "UNAVAILABLE");
        assert.equal(diff.timeline.reason, "no_breadcrumbs", "Diff engine must handle pruned breadcrumbs gracefully");
    });
});
