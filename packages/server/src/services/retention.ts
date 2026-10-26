import { prisma } from "../database/db.js";

export type TieredRetentionResult = {
    warmStrippedCount: number;
    coldDeletedAttempts: number;
    orphanJobsDeleted: number;
    warmCutoff: string;
    coldCutoff: string;
    durationMs: number;
};

export async function runRetentionSweep(
    warmDays = 7,       // Day 8+: Strip payload and breadcrumbs
    coldDays = 30,      // Day 30+: Delete attempt completely
    batchSize = 500
): Promise<TieredRetentionResult> {
    const startTime = Date.now();
    const warmCutoff = new Date(Date.now() - warmDays * 24 * 60 * 60 * 1000);
    const coldCutoff = new Date(Date.now() - coldDays * 24 * 60 * 60 * 1000);

    let warmStrippedCount = 0;
    let coldDeletedAttempts = 0;
    let orphanJobsDeleted = 0;

    try {
        // =====================================================================
        // STAGE 1 (WARM TIER): Strip heavy JSON (Day 8 to 30)
        // Keeps the row, error name, and duration, but sets payload/breadcrumbs to NULL
        // =====================================================================
        while (true) {
            const strippedCount: number = await prisma.$executeRaw`
                UPDATE job_attempts
                SET payload = NULL, breadcrumbs = NULL
                WHERE id IN (
                    SELECT id FROM job_attempts
                    WHERE failed_at < ${warmCutoff}
                      AND failed_at >= ${coldCutoff}
                      AND (payload IS NOT NULL OR breadcrumbs IS NOT NULL)
                    ORDER BY failed_at ASC
                    LIMIT ${batchSize}
                    FOR UPDATE SKIP LOCKED
                )
            `;

            warmStrippedCount += strippedCount;
            if (strippedCount < batchSize) break;
            await new Promise((r) => setTimeout(r, 100)); // Yield to DB
        }

        // =====================================================================
        // STAGE 2 (COLD TIER): Permanently delete attempts older than 30 days
        // =====================================================================
        while (true) {
            const deletedAttempts: number = await prisma.$executeRaw`
                DELETE FROM job_attempts
                WHERE id IN (
                    SELECT id FROM job_attempts
                    WHERE failed_at < ${coldCutoff}
                    ORDER BY failed_at ASC
                    LIMIT ${batchSize}
                    FOR UPDATE SKIP LOCKED
                )
            `;

            coldDeletedAttempts += deletedAttempts;
            if (deletedAttempts < batchSize) break;
            await new Promise((r) => setTimeout(r, 100));
        }

        // =====================================================================
        // STAGE 3: Clean orphan jobs (Jobs whose attempts were all deleted)
        // Guarded by updated_at < coldCutoff to protect in-flight active jobs
        // =====================================================================
        while (true) {
            const deletedOrphans: number = await prisma.$executeRaw`
                DELETE FROM jobs
                WHERE id IN (
                    SELECT j.id FROM jobs j
                    WHERE j.updated_at < ${coldCutoff}
                      AND NOT EXISTS (
                          SELECT 1 FROM job_attempts a WHERE a.job_id = j.id
                      )
                    ORDER BY j.updated_at ASC
                    LIMIT ${batchSize}
                    FOR UPDATE OF j SKIP LOCKED
                )
            `;

            orphanJobsDeleted += deletedOrphans;
            if (deletedOrphans < batchSize) break;
            await new Promise((r) => setTimeout(r, 100));
        }
    } catch (error) {
        console.error("[Retention Engine] Error during sweep:", error);
        throw error;
    }

    return {
        warmStrippedCount,
        coldDeletedAttempts,
        orphanJobsDeleted,
        warmCutoff: warmCutoff.toISOString(),
        coldCutoff: coldCutoff.toISOString(),
        durationMs: Date.now() - startTime,
    };
}
