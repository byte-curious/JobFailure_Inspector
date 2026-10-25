import { prisma } from "../database/db.js";

export type AttemptForClassification = {
    jobId: string;
    attemptNumber: number;
    errorFingerprint: string;
    failedAt: Date;
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

export function calculateDeterministicWindow(failedAt: Date, windowMinutes = 5) {
    const windowEnd = failedAt;
    const windowStart = new Date(windowEnd.getTime() - windowMinutes * 60 * 1000);
    return { windowStart, windowEnd };
}

export async function classifyAttempt(
    attempt: AttemptForClassification,
    queueName: string,
    threshold = 3,
    windowMinutes = 5
): Promise<FailureClassification> {
    const { windowStart, windowEnd } = calculateDeterministicWindow(attempt.failedAt, windowMinutes);

    // 1. Blast Radius Query: Count distinct jobs in this queue failing with this fingerprint in the window
    // (High-performance SQL query leveraging our @@index([errorFingerprint, failedAt]))
    const distinctJobsInQueueCount = await prisma.job.count({
        where: {
            queueName,
            attempts: {
                some: {
                    errorFingerprint: attempt.errorFingerprint,
                    failedAt: {
                        gte: windowStart,
                        lte: windowEnd,
                    },
                },
            },
        },
    });

    // 2. Retry Query: Check if THIS specific job saw this exact fingerprint in an earlier attempt
    const priorAttempt = await prisma.jobAttempts.findFirst({
        where: {
            jobId: attempt.jobId,
            attemptNumber: { lt: attempt.attemptNumber },
            errorFingerprint: attempt.errorFingerprint,
        },
        select: { id: true },
    });

    const sameErrorSeenInPriorAttempt = Boolean(priorAttempt);
    const isShared = distinctJobsInQueueCount >= threshold; // Fixed: >= instead of >

    // 3. Category Determination
    let category: FailureClassification["category"];
    if (isShared) {
        category = "SHARED_INCIDENT";
    } else if (sameErrorSeenInPriorAttempt) {
        category = "REPEATED_SAME_ERROR";
    } else {
        category = "ISOLATED_OR_NEW_ERROR";
    }

    return {
        category,
        evidence: {
            evaluatedAt: new Date().toISOString(),
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            queueName,
            errorFingerprint: attempt.errorFingerprint,
            distinctJobsInQueueCount,
            threshold,
            isShared,
            sameErrorSeenInPriorAttempt,
            attemptNumber: attempt.attemptNumber,
        },
    };
}
