export type AlertKind =
    | "OPENED"
    | "REGRESSION"
    | "ESCALATED_SHARED"
    | "DEAD_LETTER_DIGEST"
    | "RECOVERED"
    | "RATE_CAP_SUMMARY";

export type IncidentStateForAlert = {
    id: string;
    epoch: number;
    lastDecidedEpoch: number;
    lastSentEpoch: number;
    lastAlertKind: string | null;
    digestSeq: number;
    digestFinalCount: number;
    finalFailureCount: number;
    eventCount: number;
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
    // If an on-call engineer snoozed/muted this incident, stay 100% silent
    if (incident.mutedUntil && incident.mutedUntil > now) {
        return null;
    }

    const hourBucket = now.toISOString().slice(0, 13); // e.g. "2026-03-01T14"
    const isRateCapped = alertsInLastHour >= rateCapPerHour;

    // RULE 2: Outage Escalation (Google SRE principle: Outages ALWAYS cut through rate limits!)
    // If 3+ distinct jobs in this queue crashed in the last 5 minutes, alert immediately!
    if (distinctJobsInWindow >= threshold && incident.lastAlertKind !== "ESCALATED_SHARED") {
        return {
            kind: "ESCALATED_SHARED",
            dedupeKey: `${incident.id}:${incident.epoch}:ESCALATED_SHARED`,
            reason: `Shared Outage: ${distinctJobsInWindow} distinct jobs failed in the last 5 minutes`,
        };
    }

    // RULE 3: Global Rate Cap Backstop
    // If more than 20 alerts fired in the last hour, suppress individual alerts to prevent channel flooding
    if (isRateCapped) {
        return {
            kind: "RATE_CAP_SUMMARY",
            dedupeKey: `GLOBAL:RATE_CAP:${hourBucket}`,
            reason: `Alert flood detected: ${alertsInLastHour} alerts in the last hour. Suppressing individual alerts.`,
        };
    }

    // RULE 4: Regression
    // If an incident was previously marked RESOLVED and errors start happening again, alert immediately
    if (!isNew && incident.epoch > incident.lastDecidedEpoch) {
        return {
            kind: "REGRESSION",
            dedupeKey: `${incident.id}:${incident.epoch}:REGRESSION`,
            reason: `Regression: Failures resumed after resolution (epoch bumped to ${incident.epoch})`,
        };
    }

    // RULE 5: Dead-Letter Failure
    // If a job permanently exhausted all of its retries, alert so developers know customer data is stuck
    if (isFinalAttempt && incident.finalFailureCount > incident.digestFinalCount) {
        const nextSeq = incident.digestSeq + 1;
        return {
            kind: "DEAD_LETTER_DIGEST",
            dedupeKey: `${incident.id}:${incident.epoch}:DIGEST:${nextSeq}`,
            reason: `Job permanently dead-lettered (final failure count: ${incident.finalFailureCount})`,
        };
    }

    // RULE 6: Calm Alerting for New Errors
    // The Core Industry Standard:
    // If this is a 1-time transient failure on Attempt 1 with retries remaining, STAY SILENT!
    // BullMQ will retry it. If it succeeds, we avoided waking someone up for nothing.
    // We only alert 'OPENED' if the error proves to be persistent (failed 2+ times) or had retries exhausted.
    if ((isNew || incident.lastDecidedEpoch === 0) && (incident.eventCount >= 2 || isFinalAttempt)) {
        return {
            kind: "OPENED",
            dedupeKey: `${incident.id}:${incident.epoch}:OPENED`,
            reason: `New error fingerprint confirmed across multiple failures in queue`,
        };
    }

    // Default: stay silent and let BullMQ automatic retries do their job
    return null;
}
