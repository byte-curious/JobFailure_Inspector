import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeExecutionDiff } from "../src/services/diff.js";
import type { AttemptLike } from "../src/services/diff.js";

// Helper to create mock attempts with sensible defaults
function mockAttempt(overrides: Partial<AttemptLike> = {}): AttemptLike {
    return {
        attemptNumber: 1,
        errorName: "Error",
        errorMessage: "Default error",
        errorFingerprint: "fp_initial",
        duration: 1000,
        breadcrumbs: [],
        droppedBreadcrumbs: 0,
        ...overrides,
    };
}

describe("Execution Diff Engine", () => {
    // ==========================================
    // 1. BASELINE & ATTEMPT GAP TESTS
    // ==========================================
    describe("Baseline & Gap Tracking", () => {
        it("should return hasBaseline: false when previous attempt is missing", () => {
            const current = mockAttempt({ attemptNumber: 1 });
            const diff = computeExecutionDiff(current, null);

            assert.equal(diff.hasBaseline, false);
            assert.match(diff.message, /no earlier baseline exists/);
        });

        it("should detect attempt gaps (comparing Attempt 1 vs Attempt 3)", () => {
            const prev = mockAttempt({ attemptNumber: 1, duration: 2000, errorFingerprint: "fp_1" });
            const curr = mockAttempt({ attemptNumber: 3, duration: 1500, errorFingerprint: "fp_2" });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline) return;

            assert.equal(diff.hasAttemptGap, true, "Should flag gap when 3 - 1 > 1");
            assert.equal(diff.fingerprintChanged, true);
            assert.equal(diff.durationDeltaMs, -500, "1500 - 2000 = -500ms");
        });
    });

    // ==========================================
    // 2. SCOPE TESTS (UNAVAILABLE & UNKNOWN)
    // ==========================================
    describe("Scope Detection & Edge Cases", () => {
        it("should return scope: UNAVAILABLE when breadcrumbs are null or malformed", () => {
            const prev = mockAttempt({ attemptNumber: 1, breadcrumbs: null });
            const curr = mockAttempt({ attemptNumber: 2, breadcrumbs: [] });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline) return;

            assert.equal(diff.timeline.scope, "UNAVAILABLE");
            assert.equal(diff.timeline.reason, "no_breadcrumbs");
        });

        it("should return scope: UNKNOWN_TRUNCATION for legacy rows with droppedBreadcrumbs = null", () => {
            const prev = mockAttempt({ attemptNumber: 1, droppedBreadcrumbs: null, breadcrumbs: [{ message: "Step 1" }] });
            const curr = mockAttempt({ attemptNumber: 2, droppedBreadcrumbs: 0, breadcrumbs: [{ message: "Step 1" }] });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline) return;

            assert.equal(diff.timeline.scope, "UNKNOWN_TRUNCATION");
            assert.equal(diff.timeline.reason, "legacy_sdk_null_dropped_count");
        });
    });

    // ==========================================
    // 3. FULL SCOPE OUTCOMES (0 DROPPED)
    // ==========================================
    describe("Full Scope Structural Outcomes", () => {
        it("should return EMPTY_BOTH when both arrays are empty", () => {
            const prev = mockAttempt({ attemptNumber: 1, breadcrumbs: [] });
            const curr = mockAttempt({ attemptNumber: 2, breadcrumbs: [] });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "FULL") return;

            assert.equal(diff.timeline.outcome.status, "EMPTY_BOTH");
        });

        it("should return IDENTICAL for matching events, stripping URL queries", () => {
            const prev = mockAttempt({
                attemptNumber: 1,
                breadcrumbs: [
                    { category: "checkpoint", message: "Init worker" },
                    { category: "http", message: "GET /charges", data: { url: "https://api.stripe.com/charges?id=123", method: "GET", statusCode: 200 } }
                ],
            });
            const curr = mockAttempt({
                attemptNumber: 2,
                breadcrumbs: [
                    { category: "checkpoint", message: "Init worker" },
                    { category: "http", message: "GET /charges", data: { url: "https://api.stripe.com/charges?id=456", method: "GET", statusCode: 200 } }
                ],
            });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "FULL") return;

            assert.equal(diff.timeline.outcome.status, "IDENTICAL", "URL queries should be stripped, matching path /charges");
        });

        it("should detect CURRENT_ENDS_EARLIER (strict prefix)", () => {
            const prev = mockAttempt({
                attemptNumber: 1,
                breadcrumbs: [{ message: "Step 1" }, { message: "Step 2" }, { message: "Step 3" }],
            });
            const curr = mockAttempt({
                attemptNumber: 2,
                breadcrumbs: [{ message: "Step 1" }],
            });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "FULL") return;

            assert.equal(diff.timeline.outcome.status, "CURRENT_ENDS_EARLIER");
            assert.equal(diff.timeline.outcome.prefixLength, 1);
        });

        it("should detect PREVIOUS_ENDS_EARLIER when current takes additional steps", () => {
            const prev = mockAttempt({
                attemptNumber: 1,
                breadcrumbs: [{ message: "Step 1" }],
            });
            const curr = mockAttempt({
                attemptNumber: 2,
                breadcrumbs: [{ message: "Step 1" }, { message: "Step 2" }],
            });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "FULL") return;

            assert.equal(diff.timeline.outcome.status, "PREVIOUS_ENDS_EARLIER");
            assert.equal(diff.timeline.outcome.prefixLength, 1);
        });

        it("should detect REORDERED for same events in different order (Promise.all)", () => {
            const prev = mockAttempt({
                attemptNumber: 1,
                breadcrumbs: [{ message: "Fetch User" }, { message: "Fetch Inventory" }],
            });
            const curr = mockAttempt({
                attemptNumber: 2,
                breadcrumbs: [{ message: "Fetch Inventory" }, { message: "Fetch User" }],
            });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "FULL") return;

            assert.equal(diff.timeline.outcome.status, "REORDERED");
            assert.equal(diff.timeline.outcome.matchedCount, 2);
        });

        it("should detect DIVERGED at first mismatch index with structural event details", () => {
            const prev = mockAttempt({
                attemptNumber: 1,
                breadcrumbs: [
                    { category: "checkpoint", message: "Step 1" },
                    { category: "http", message: "POST /pay", data: { url: "https://stripe.com/pay", statusCode: 200 } }
                ],
            });
            const curr = mockAttempt({
                attemptNumber: 2,
                breadcrumbs: [
                    { category: "checkpoint", message: "Step 1" },
                    { category: "http", message: "POST /pay", data: { url: "https://stripe.com/pay", statusCode: 504 } } // Differing status!
                ],
            });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "FULL") return;

            assert.equal(diff.timeline.outcome.status, "DIVERGED");
            assert.equal(diff.timeline.outcome.divergenceIndex, 1);
            assert.equal(diff.timeline.outcome.previousEvent.statusCode, 200);
            assert.equal(diff.timeline.outcome.currentEvent.statusCode, 504);
        });
    });

    // ==========================================
    // 4. TAIL_ONLY SCOPE (OVERFLOWED BUFFERS)
    // ==========================================
    describe("Tail Scope Outcomes (stepsFromEnd)", () => {
        it("should detect TAIL_DIVERGED and calculate stepsFromEnd backwards from crash", () => {
            const prev = mockAttempt({
                attemptNumber: 1,
                droppedBreadcrumbs: 17, // Overflowed
                breadcrumbs: [
                    { message: "Step 48" },
                    { message: "Step 49" },
                    { category: "http", message: "POST /invoice", data: { statusCode: 200 } },
                ],
            });
            const curr = mockAttempt({
                attemptNumber: 2,
                droppedBreadcrumbs: 25, // Overflowed
                breadcrumbs: [
                    { message: "Step 48" },
                    { message: "Step 49" },
                    { category: "http", message: "POST /invoice", data: { statusCode: 500 } }, // Diverged on the final step!
                ],
            });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "TAIL_ONLY") return;

            assert.equal(diff.timeline.outcome.status, "TAIL_DIVERGED");
            assert.equal(diff.timeline.outcome.stepsFromEnd, 1, "Diverged exactly 1 step from the end (the crash)");
            assert.equal(diff.timeline.droppedPrevious, 17);
            assert.equal(diff.timeline.droppedCurrent, 25);
        });

        it("should detect TAIL_IDENTICAL when the trailing events match perfectly", () => {
            const prev = mockAttempt({
                attemptNumber: 1,
                droppedBreadcrumbs: 5,
                breadcrumbs: [{ message: "Final DB update" }, { message: "Clean exit" }],
            });
            const curr = mockAttempt({
                attemptNumber: 2,
                droppedBreadcrumbs: 10,
                breadcrumbs: [{ message: "Final DB update" }, { message: "Clean exit" }],
            });

            const diff = computeExecutionDiff(curr, prev);
            assert.equal(diff.hasBaseline, true);
            if (!diff.hasBaseline || diff.timeline.scope !== "TAIL_ONLY") return;

            assert.equal(diff.timeline.outcome.status, "TAIL_IDENTICAL");
            assert.equal(diff.timeline.outcome.eventsCompared, 2);
        });
    });
});
