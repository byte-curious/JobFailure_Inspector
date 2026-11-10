import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideAlert } from "../src/services/decideAlert.js";
import type { IncidentStateForAlert } from "../src/services/decideAlert.js";

function mockIncident(overrides: Partial<IncidentStateForAlert> = {}): IncidentStateForAlert {
    return {
        id: "inc_test_123",
        epoch: 1,
        lastDecidedEpoch: 0,
        lastSentEpoch: 0,
        lastAlertKind: null,
        digestSeq: 0,
        digestFinalCount: 0,
        finalFailureCount: 0,
        eventCount: 2, // Default to confirmed persistent error
        mutedUntil: null,
        ...overrides,
    };
}

describe("Alert Decision Engine (decideAlert)", () => {
    const now = new Date("2026-03-01T14:00:00.000Z");

    // ==========================================
    // 1. CALM TRANSIENT SUPPRESSION
    // ==========================================
    it("should stay SILENT on a single 1-time transient error when retries remain", () => {
        const incident = mockIncident({ eventCount: 1 }); // Only 1 failure so far
        const decision = decideAlert({
            incident,
            isNew: true,
            distinctJobsInWindow: 1,
            threshold: 3,
            isFinalAttempt: false, // BullMQ still has retries left!
            alertsInLastHour: 0,
            now,
        });

        // MUST stay silent so developers aren't spammed by temporary self-healing blips!
        assert.equal(decision, null, "1-time transient errors with retries remaining must stay silent");
    });

    it("should alert OPENED once a new error repeats (eventCount >= 2)", () => {
        const incident = mockIncident({ eventCount: 2 }); // Failed twice!
        const decision = decideAlert({
            incident,
            isNew: true,
            distinctJobsInWindow: 1,
            threshold: 3,
            isFinalAttempt: false,
            alertsInLastHour: 0,
            now,
        });

        assert.notEqual(decision, null);
        assert.equal(decision?.kind, "OPENED");
        assert.equal(decision?.dedupeKey, "inc_test_123:1:OPENED");
    });

    it("should alert immediately on Attempt 1 if it is a DEAD_LETTER (no retries left)", () => {
        const incident = mockIncident({ eventCount: 1, finalFailureCount: 1, digestFinalCount: 0 });
        const decision = decideAlert({
            incident,
            isNew: true,
            distinctJobsInWindow: 1,
            threshold: 3,
            isFinalAttempt: true, // Dead letter immediately!
            alertsInLastHour: 0,
            now,
        });

        assert.notEqual(decision, null);
        assert.equal(decision?.kind, "DEAD_LETTER_DIGEST");
    });

    // ==========================================
    // 2. REGRESSION RULES
    // ==========================================
    it("should trigger REGRESSION when an incident reopens with a newer epoch", () => {
        const incident = mockIncident({ epoch: 2, lastDecidedEpoch: 1, eventCount: 2 });
        const decision = decideAlert({
            incident,
            isNew: false,
            distinctJobsInWindow: 1,
            threshold: 3,
            isFinalAttempt: false,
            alertsInLastHour: 0,
            now,
        });

        assert.notEqual(decision, null);
        assert.equal(decision?.kind, "REGRESSION");
        assert.equal(decision?.dedupeKey, "inc_test_123:2:REGRESSION");
    });

    // ==========================================
    // 3. MUTE SNOOZING
    // ==========================================
    it("should stay completely silent if the incident is currently muted", () => {
        const futureMute = new Date("2026-03-01T15:00:00.000Z");
        const incident = mockIncident({ mutedUntil: futureMute });

        const decision = decideAlert({
            incident,
            isNew: true,
            distinctJobsInWindow: 5,
            threshold: 3,
            isFinalAttempt: true,
            alertsInLastHour: 0,
            now,
        });

        assert.equal(decision, null, "Muted incidents must never alert");
    });

    // ==========================================
    // 4. OUTAGE ESCALATION
    // ==========================================
    it("should trigger ESCALATED_SHARED when distinct jobs in window >= threshold", () => {
        const incident = mockIncident({ lastDecidedEpoch: 1, lastAlertKind: "OPENED" });

        const decision = decideAlert({
            incident,
            isNew: false,
            distinctJobsInWindow: 3,
            threshold: 3,
            isFinalAttempt: false,
            alertsInLastHour: 0,
            now,
        });

        assert.notEqual(decision, null);
        assert.equal(decision?.kind, "ESCALATED_SHARED");
        assert.equal(decision?.dedupeKey, "inc_test_123:1:ESCALATED_SHARED");
    });

    it("should NOT re-trigger ESCALATED_SHARED if it already escalated in this epoch", () => {
        const incident = mockIncident({
            lastDecidedEpoch: 1,
            lastAlertKind: "ESCALATED_SHARED",
        });

        const decision = decideAlert({
            incident,
            isNew: false,
            distinctJobsInWindow: 5,
            threshold: 3,
            isFinalAttempt: false,
            alertsInLastHour: 0,
            now,
        });

        assert.equal(decision, null, "Must not repeat escalation alert in the same epoch");
    });

    // ==========================================
    // 5. GLOBAL RATE CAPPING
    // ==========================================
    it("should trigger RATE_CAP_SUMMARY when alert limit is exceeded", () => {
        const incident = mockIncident();

        const decision = decideAlert({
            incident,
            isNew: true,
            distinctJobsInWindow: 1,
            threshold: 3,
            isFinalAttempt: false,
            alertsInLastHour: 20,
            rateCapPerHour: 20,
            now,
        });

        assert.notEqual(decision, null);
        assert.equal(decision?.kind, "RATE_CAP_SUMMARY");
        assert.match(decision?.dedupeKey || "", /^GLOBAL:RATE_CAP:2026-03-01T14/);
    });

    it("should NEVER rate-cap an ESCALATED_SHARED outage alert", () => {
        const incident = mockIncident({ lastDecidedEpoch: 1 });

        const decision = decideAlert({
            incident,
            isNew: false,
            distinctJobsInWindow: 4,
            threshold: 3,
            isFinalAttempt: false,
            alertsInLastHour: 50,
            rateCapPerHour: 20,
            now,
        });

        assert.notEqual(decision, null);
        assert.equal(decision?.kind, "ESCALATED_SHARED", "Critical outages must cut through rate limits");
    });
});
