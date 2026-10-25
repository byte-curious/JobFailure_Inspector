
export type StructuralEvent = {
    category: string;
    normalizedMessage: string;
    method?: string;
    host?: string;
    path?: string;
    statusCode?: number;
};

// 1. Full Comparison Outcomes (When 0 items were dropped by either attempt)
export type FullOutcome =
    | { status: "EMPTY_BOTH" }
    | { status: "IDENTICAL" }
    | { status: "REORDERED"; matchedCount: number }
    | { status: "CURRENT_ENDS_EARLIER"; prefixLength: number }
    | { status: "PREVIOUS_ENDS_EARLIER"; prefixLength: number }
    | {
        status: "DIVERGED";
        divergenceIndex: number;
        previousEvent: StructuralEvent;
        currentEvent: StructuralEvent;
    };

// 2. Tail Comparison Outcomes (When buffer overflowed and we compare the last K events)
export type TailOutcome =
    | { status: "TAIL_IDENTICAL"; eventsCompared: number }
    | { status: "TAIL_REORDERED"; eventsCompared: number }
    | {
        status: "TAIL_DIVERGED";
        stepsFromEnd: number; // e.g. 1 means "diverged on the final step"
        previousEvent: StructuralEvent;
        currentEvent: StructuralEvent;
    };

// 3. Strict Discriminated Union for Breadcrumbs
export type BreadcrumbComparison =
    | { scope: "UNAVAILABLE"; reason: "no_breadcrumbs" | "malformed_json" }
    | { scope: "UNKNOWN_TRUNCATION"; reason: "legacy_sdk_null_dropped_count"; rawCountPrevious: number; rawCountCurrent: number }
    | { scope: "FULL"; eventsCompared: number; outcome: FullOutcome }
    | {
        scope: "TAIL_ONLY";
        eventsCompared: number;
        droppedPrevious: number;
        droppedCurrent: number;
        outcome: TailOutcome;
    };

// 4. The Final Execution Diff
export type ExecutionDiff =
    | { hasBaseline: false; message: "First recorded attempt for this job; no earlier baseline exists." }
    | {
        hasBaseline: true;
        previousAttemptNumber: number;
        currentAttemptNumber: number;
        hasAttemptGap: boolean; // e.g. comparing Attempt 1 vs Attempt 3

        // Error Observation
        fingerprintChanged: boolean;
        previousErrorName: string;
        currentErrorName: string;
        previousErrorCode?: string;
        currentErrorCode?: string;

        // Timing Observation
        durationDeltaMs: number | null; // Null if either attempt has null duration

        // Timeline Observation (Zero impossible states!)
        timeline: BreadcrumbComparison;
    };
