export type JobStatus = "FAILED" | "DEAD_LETTER" | "RESOLVED";

export type JobSummary = {
    id: string;
    externalJobId: string;
    queueName: string;
    status: JobStatus;
    totalAttempts: number;
    updatedAt: string;
    latestAttempt: {
        attemptNumber: number;
        errorMessage: string;
        errorName: string;
        failedAt: string;
        duration: number | null;
    } | null;
};

export type JobsResponse = {
    data: JobSummary[];
    pagination: {
        totalCount: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    availableQueues: string[];
};

export type Breadcrumb = {
    category: "checkpoint" | "http" | "db" | "log";
    message: string;
    timestamp: number;
    data?: Record<string, unknown>;
};

export type AttemptDetail = {
    id: string;
    attemptNumber: number;
    errorName: string;
    errorMessage: string;
    errorStack?: string | null;
    errorFingerprint: string;
    duration: number | null;
    payload?: unknown;
    breadcrumbs?: Breadcrumb[];
    droppedBreadcrumbs?: number | null;
    failedAt: string;
};

export type ExecutionDiff = {
    hasBaseline: boolean;
    message?: string;
    previousAttemptNumber?: number;
    currentAttemptNumber?: number;
    hasAttemptGap?: boolean;
    fingerprintChanged?: boolean;
    previousErrorName?: string;
    currentErrorName?: string;
    durationDeltaMs?: number | null;
    timeline?: {
        scope: "FULL" | "TAIL_ONLY" | "UNAVAILABLE" | "UNKNOWN_TRUNCATION";
        reason?: string;
        eventsCompared?: number;
        droppedPrevious?: number;
        droppedCurrent?: number;
        outcome?: {
            status: string;
            divergenceIndex?: number;
            stepsFromEnd?: number;
            matchedCount?: number;
            prefixLength?: number;
        };
    };
};

export type FailureClassification = {
    category: "SHARED_INCIDENT" | "REPEATED_SAME_ERROR" | "ISOLATED_OR_NEW_ERROR";
    evidence: {
        evaluatedAt: string;
        windowStart: string;
        windowEnd: string;
        queueName: string;
        errorFingerprint: string;
        distinctJobsInQueueCount: number;
        threshold: number;
        isShared: boolean;
        sameErrorSeenInPriorAttempt: boolean;
        attemptNumber: number;
    };
};

export type JobDetailResponse = {
    job: {
        id: string;
        externalJobId: string;
        queueName: string;
        status: JobStatus;
        totalAttempts: number;
        createdAt: string;
        updatedAt: string;
    };
    attempts: AttemptDetail[];
    diff: ExecutionDiff | null;
    classification: FailureClassification | null;
};
