export type AlertKind =| "OPENED"| "REGRESSION" | "ESCALATED_SHARED"| "DEAD_LETTER_DIGEST"| "RECOVERED" | "RATE_CAP_SUMMARY";

export type IncidentStateForAlert = {
    id: string;
    epoch: number;
    lastDecidedEpoch: number;
    lastSentEpoch: number;
    lastAlertKind: string | null;
    digestSeq: number;
    digestFinalCount: number;
    finalFailureCount: number;
    mutedUntil: Date | null;
};

export type AlertDecision = {
    kind: AlertKind;
    dedupeKey: string;
    reason: string;
};

export function decideAlert(params: {
    incident: IncidentStateForAlert;
    isNew: boolean;
    distinctJobsInWindow: number;
    threshold: number;
    isFinalAttempt: boolean;
    alertsInLastHour: number;
    rateCapPerHour?: number;
    now: Date;
}): AlertDecision | null {
    const {
        incident,
        isNew,
        distinctJobsInWindow,
        threshold,
        isFinalAttempt,
        alertsInLastHour,
        rateCapPerHour = 20,
        now,
    } = params;

    // RULE 1: Mute Guard
    if (incident.mutedUntil && incident.mutedUntil > now) {
        return null;
    }

    // Helper for global rate-cap summary key
    const hourBucket = now.toISOString().slice(0, 13); // e.g. "2026-03-01T14"
    const isRateCapped = alertsInLastHour >= rateCapPerHour;

    // RULE 2: Outage Escalation (ALWAYS cuts through rate caps!)
    if (distinctJobsInWindow >= threshold && incident.lastAlertKind !== "ESCALATED_SHARED") {
        return {
            kind: "ESCALATED_SHARED",
            dedupeKey: `${incident.id}:${incident.epoch}:ESCALATED_SHARED`,
            reason: `Distinct jobs in 5-minute window (${distinctJobsInWindow}) met threshold (${threshold})`,
        };
    }

    // RULE 3: Global Rate Cap Backstop for non-outage alerts
    if (isRateCapped) {
        return {
            kind: "RATE_CAP_SUMMARY",
            dedupeKey: `GLOBAL:RATE_CAP:${hourBucket}`,
            reason: `Alert flood detected: ${alertsInLastHour} alerts in the last hour. Suppressing individual alerts.`,
        };
    }

    // RULE 4: Regression (Was resolved in earlier epoch, resumed failing)
    if (!isNew && incident.epoch > incident.lastDecidedEpoch) {
        return {
            kind: "REGRESSION",
            dedupeKey: `${incident.id}:${incident.epoch}:REGRESSION`,
            reason: `Incident was resolved, but failures resumed (epoch bumped to ${incident.epoch})`,
        };
    }

    // RULE 5: Brand New Incident (First occurrence)
    if (isNew || incident.lastDecidedEpoch === 0) {
        return {
            kind: "OPENED",
            dedupeKey: `${incident.id}:${incident.epoch}:OPENED`,
            reason: `New unseen error fingerprint in queue`,
        };
    }

    // RULE 6: Dead-Letter Digest
    if (isFinalAttempt && incident.finalFailureCount > incident.digestFinalCount) {
        const nextSeq = incident.digestSeq + 1;
        return {
            kind: "DEAD_LETTER_DIGEST",
            dedupeKey: `${incident.id}:${incident.epoch}:DIGEST:${nextSeq}`,
            reason: `Final failure count increased to ${incident.finalFailureCount}`,
        };
    }

    // Default: stay silent
    return null;
}
