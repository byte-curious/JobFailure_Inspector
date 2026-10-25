import { normalizeErrorMessage } from "../utils/normalize.js";
import type { StructuralEvent, ExecutionDiff, BreadcrumbComparison, FullOutcome, TailOutcome } from "./diff.types.js";

export type AttemptLike = {
    attemptNumber: number;
    errorName: string;
    errorMessage: string;
    errorFingerprint: string;
    errorCode?: string | null;
    duration: number | null;
    breadcrumbs: unknown; // Prisma Json
    droppedBreadcrumbs: number | null;
};


function parseUrlDetails(rawURL?: unknown) {
    if (typeof rawURL !== "string") return {};
    try {
        const parsed = new URL(rawURL, "http://placeholder");
        return {
            host: parsed.host !== "placeholder" ? parsed.host : undefined,
            path: parsed.pathname, // remove query parameters
        };
    } catch {
        return {};
    }
}

// convert raw breadcrumb to structure 
function toStructuralEvent(raw: unknown): StructuralEvent | null {
    if (!raw || typeof raw !== 'object') return null;

    const b = raw as Record<string, unknown>
    const category = typeof b.category === "string" ? b.category : "checkpoint";
    const normalizedMessage = normalizeErrorMessage(typeof b.message === "string" ? b.message : "")
    const data = b.data && typeof b.data === "object" ? (b.data as Record<string, unknown>) : undefined;

    const { host, path } = parseUrlDetails(data?.url)
    return {
        category,
        normalizedMessage,
        method: typeof data?.method === "string" ? data.method.toUpperCase() : undefined,
        host,
        path,
        statusCode: typeof data?.statusCode === "number" ? data.statusCode : undefined,
    };
}
function isEventEqual(a: StructuralEvent, b: StructuralEvent): boolean {
    return (
        a.category === b.category &&
        a.normalizedMessage === b.normalizedMessage &&
        a.method === b.method &&
        a.host === b.host &&
        a.path === b.path &&
        a.statusCode === b.statusCode
    );
};
function eventToCanonicalKey(e: StructuralEvent): string {
    return `${e.category}|${e.normalizedMessage}|${e.method ?? ""}|${e.host ?? ""}|${e.path ?? ""}|${e.statusCode ?? ""}`;
}

function areMultisetsEqual(a: StructuralEvent[], b: StructuralEvent[]): boolean {
    if (a.length !== b.length) return false;

    const counts = new Map<string, number>();

    for (const e of a) {
        const k = eventToCanonicalKey(e);
        counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    for (const e of b) {
        const k = eventToCanonicalKey(e);
        const count = counts.get(k);
        if (!count) return false;
        if (count == 1) counts.delete(k);
        else counts.set(k, count - 1);
    }

    return counts.size === 0;
}

function parseBreadcrumbs(raw: unknown):
    | { valid: true; events: StructuralEvent[] }
    | { valid: false; reason: "no_breadcrumbs" | "malformed_json" } {

    if (raw === null || raw === undefined) {
        return { valid: false, reason: "no_breadcrumbs" };
    }

    if (!Array.isArray(raw)) {
        return { valid: false, reason: "malformed_json" };
    }

    const events: StructuralEvent[] = [];
    for (const item of raw) {
        const parsed = toStructuralEvent(item);
        if (!parsed) return { valid: false, reason: "malformed_json" };
        events.push(parsed);
    }
    return { valid: true, events };
}

export function computeExecutionDiff(current: AttemptLike, previous?: AttemptLike | null): ExecutionDiff {
    // 1. Baseline Check
    if (!previous) {
        return {
            hasBaseline: false,
            message: "First recorded attempt for this job; no earlier baseline exists.",
        };
    }

    // 2. Metadata Deltas
    const hasAttemptGap = current.attemptNumber - previous.attemptNumber > 1; // Boolean!
    const fingerprintChanged = current.errorFingerprint !== previous.errorFingerprint;
    const durationDeltaMs =
        current.duration !== null && previous.duration !== null
            ? current.duration - previous.duration
            : null;

    // 3. Parse & Validate Breadcrumbs for BOTH attempts
    const prevParsed = parseBreadcrumbs(previous.breadcrumbs);
    const currParsed = parseBreadcrumbs(current.breadcrumbs);

    const baseMetadata = {
        hasBaseline: true as const,
        previousAttemptNumber: previous.attemptNumber,
        currentAttemptNumber: current.attemptNumber,
        hasAttemptGap,
        fingerprintChanged,
        previousErrorName: previous.errorName,
        currentErrorName: current.errorName,
        previousErrorCode: previous.errorCode ?? undefined,
        currentErrorCode: current.errorCode ?? undefined,
        durationDeltaMs,
    };

    if (!prevParsed.valid) {
        return { ...baseMetadata, timeline: { scope: "UNAVAILABLE", reason: prevParsed.reason } };
    }
    if (!currParsed.valid) {
        return { ...baseMetadata, timeline: { scope: "UNAVAILABLE", reason: currParsed.reason } };
    }

    const prevEvents = prevParsed.events;
    const currEvents = currParsed.events;

    // 4. Scope Detection
    // If droppedBreadcrumbs is null on either -> scope: "UNKNOWN_TRUNCATION"
    // If droppedBreadcrumbs is 0 on both -> scope: "FULL"
    // If droppedBreadcrumbs > 0 on either -> scope: "TAIL_ONLY"

    let timeline: BreadcrumbComparison;

    if (previous.droppedBreadcrumbs === null || current.droppedBreadcrumbs === null) {
        timeline = {
            scope: "UNKNOWN_TRUNCATION",
            reason: "legacy_sdk_null_dropped_count",
            rawCountPrevious: prevEvents.length,
            rawCountCurrent: currEvents.length,
        };
    } else if (previous.droppedBreadcrumbs > 0 || current.droppedBreadcrumbs > 0) {
        // TAIL_ONLY: Align from crash backwards
        const K = Math.min(prevEvents.length, currEvents.length);
        const prevTail = prevEvents.slice(prevEvents.length - K);
        const currTail = currEvents.slice(currEvents.length - K);

        let tailDiffFromEnd = -1;
        for (let step = 1; step <= K; step++) {
            const p = prevTail[prevTail.length - step];
            const c = currTail[currTail.length - step];
            if (!isEventEqual(p, c)) {
                tailDiffFromEnd = step;
                break;
            }
        }

        let outcome: TailOutcome;
        if (tailDiffFromEnd === -1) {
            outcome = { status: "TAIL_IDENTICAL", eventsCompared: K };
        } else if (areMultisetsEqual(prevTail, currTail)) {
            outcome = { status: "TAIL_REORDERED", eventsCompared: K };
        } else {
            outcome = {
                status: "TAIL_DIVERGED",
                stepsFromEnd: tailDiffFromEnd,
                previousEvent: prevTail[prevTail.length - tailDiffFromEnd],
                currentEvent: currTail[currTail.length - tailDiffFromEnd],
            };
        }

        timeline = {
            scope: "TAIL_ONLY",
            eventsCompared: K,
            droppedPrevious: previous.droppedBreadcrumbs,
            droppedCurrent: current.droppedBreadcrumbs,
            outcome,
        };
    } else {
        // FULL SCOPE: 0 items dropped on both sides
        let outcome: FullOutcome;

        if (prevEvents.length === 0 && currEvents.length === 0) {
            outcome = { status: "EMPTY_BOTH" };
        } else {
            const minLen = Math.min(prevEvents.length, currEvents.length);
            let firstDiffIndex = -1;

            for (let i = 0; i < minLen; i++) {
                if (!isEventEqual(prevEvents[i], currEvents[i])) {
                    firstDiffIndex = i;
                    break;
                }
            }

            if (firstDiffIndex === -1) {
                if (prevEvents.length === currEvents.length) {
                    outcome = { status: "IDENTICAL" };
                } else if (currEvents.length < prevEvents.length) {
                    outcome = { status: "CURRENT_ENDS_EARLIER", prefixLength: currEvents.length };
                } else {
                    outcome = { status: "PREVIOUS_ENDS_EARLIER", prefixLength: prevEvents.length };
                }
            } else if (areMultisetsEqual(prevEvents, currEvents)) {
                outcome = { status: "REORDERED", matchedCount: prevEvents.length };
            } else {
                outcome = {
                    status: "DIVERGED",
                    divergenceIndex: firstDiffIndex,
                    previousEvent: prevEvents[firstDiffIndex],
                    currentEvent: currEvents[firstDiffIndex],
                };
            }
        }

        timeline = {
            scope: "FULL",
            eventsCompared: Math.min(prevEvents.length, currEvents.length),
            outcome,
        };
    }

    return { ...baseMetadata, timeline };
}
