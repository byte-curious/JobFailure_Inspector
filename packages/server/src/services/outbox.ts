import crypto from "node:crypto";
import { prisma } from "../database/db.js";

const ALLOWED_DISCORD_HOSTS = new Set([
    "discord.com",
    "discordapp.com",
    "ptb.discord.com",
    "canary.discord.com",
]);

// escape the untrusted markdown
export function escapeMarkdown(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/@everyone/gi, "@[everyone]")
        .replace(/@here/gi, "@[here]")
        .replace(/```/g, "'''");
}

export function formatSlackMessage(payload: any) {
    const rawTitle =
        payload.event === "DEAD_LETTER_DIGEST"
            ? `Dead Letter Digest: ${payload.queueName}`
            : payload.event === "ESCALATED_SHARED"
                ? `Shared Outage Detected in : ${payload.queueName}`
                : payload.event === "REGRESSION"
                    ? `Regession: Error resumed in : ${payload.queueName}`
                    : payload.event === "RECOVERED"
                        ? `Incident Recovered in : ${payload.queueName}`
                        : `New Error in : ${payload.queueName}`;

    const title = escapeMarkdown(rawTitle).slice(0, 150);
    const errorDetails = escapeMarkdown(payload.errorMessage || "No message").slice(0, 2000);

    return {
        text: title,
        blocks: [
            {
                type: "header",
                text: { type: "plain_text", text: title },
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Queue:*\n\`${escapeMarkdown(payload.queueName)}\`` },
                    { type: "mrkdwn", text: `*Trigger:*\n\`${payload.event}\`` },
                    { type: "mrkdwn", text: `*Error Name:*\n*${escapeMarkdown(payload.errorName)}*` },
                    { type: "mrkdwn", text: `*Reason:*\n${escapeMarkdown(payload.reason || "N/A")}` },
                ],
            },
            {
                type: "section",
                text: { type: "mrkdwn", text: `*Error Details:*\n\`\`\`${errorDetails}\`\`\`` },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: { type: "plain_text", text: "Inspect in Dashboard ->", emoji: true },
                        url: payload.dashboardUrl || "http://localhost:3000",
                        style: "danger",
                    },
                ],
            },
        ],
    };
}

export function formatDiscordMessage(payload: any) {
    const rawTitle =
        payload.event === "DEAD_LETTER_DIGEST"
            ? `Dead Letter Digest: ${payload.queueName}`
            : payload.event === "ESCALATED_SHARED"
                ? `Shared Outage detected in ${payload.queueName}`
                : payload.event === "RECOVERED"
                    ? `Incident Recovered in : ${payload.queueName}`
                    : payload.event === "REGRESSION"
                        ? `Regression: Error Resume in : ${payload.queueName}`
                        : `New Error in : ${payload.queueName}`;

    const title = escapeMarkdown(rawTitle).slice(0, 250);
    const description = escapeMarkdown(payload.errorMessage || "No description").slice(0, 2000);
    const isResolved = payload.event === "RECOVERED";
    const isOutage = payload.event === "ESCALATED_SHARED";

    // Discord rejects localhost URLs with HTTP 400! Only include if valid public URL
    const hasPublicUrl =
        payload.dashboardUrl &&
        !payload.dashboardUrl.includes("localhost") &&
        !payload.dashboardUrl.includes("127.0.0.1");

    return {
        embeds: [
            {
                title,
                ...(hasPublicUrl ? { url: payload.dashboardUrl } : {}),
                description: `\`\`\`${description}\`\`\``,
                color: isResolved ? 0x10b981 : isOutage ? 0xf43f5e : 0xf59e0b,
                fields: [
                    { name: "Queue", value: `\`${escapeMarkdown(payload.queueName)}\``, inline: true },
                    { name: "Trigger", value: `\`${payload.event}\``, inline: true },
                    { name: "Error", value: `*${escapeMarkdown(payload.errorName)}*`, inline: true },
                ],
                footer: { text: "JobInspector Incident Alert Engine" },
                timestamp: payload.timestamp || new Date().toISOString(),
            },
        ],
        allowed_mentions: { parse: [] }, // Fixed typo: allowed_mentions
    };
}

export async function sweepOutboxOnce() {
    // claims: 5 rows for 45s for lease
    const lockToken = crypto.randomUUID();
    // crypto.createHash('sha256').update(lockToken).digest('hex')

    const claimedRow = await prisma.$queryRaw<Array<{
        id: string;
        incident_id: string | null;
        epoch: number;
        kind: string;
        payload: any;
        attempts: number;
    }>>`
        UPDATE alert_deliveries
        SET status = 'SENDING',
            lock_token = ${lockToken},
            locked_until = NOW() + INTERVAL '45 seconds',
            attempts = attempts + 1
        WHERE id IN (
            SELECT id FROM alert_deliveries
            WHERE (status = 'PENDING' AND next_attempt_at <= NOW())
               OR (status = 'SENDING' AND locked_until < NOW()) -- Reclaims crashed worker rows!
            ORDER BY next_attempt_at ASC
            LIMIT 5
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, incident_id, epoch, kind, payload, attempts;
    `;
    if (claimedRow.length == 0) return;
    // console.log(claimedRow);

    // dispatch the HTTP calls
    // Resolve webhook URL per-project, falling back to process.env.WEBHOOK_URL
    for (const row of claimedRow) {
        const webhookURL = row.payload?.webhookUrl || process.env.WEBHOOK_URL;
        if (!webhookURL) continue; // Skip if this project has no webhook configured!

        let host: string;
        // validate webhook to prevent SSRF;
        try {
            const parsedUrl = new URL(webhookURL);
            host = parsedUrl.hostname.toLowerCase();
        } catch {
            console.warn(`[OutBox] Invalid webhook URL for alert ${row.id}`);
            continue;
        }

        const isSlack = host === "hooks.slack.com";
        const isDiscort = ALLOWED_DISCORD_HOSTS.has(host);

        let bodyPayload: any;
        if (isSlack) bodyPayload = formatSlackMessage(row.payload);
        else if (isDiscort) bodyPayload = formatDiscordMessage(row.payload);
        else bodyPayload = row.payload;

        try {
            const response = await fetch(webhookURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload),
                signal: AbortSignal.timeout(3000), // 3 second ka hard timeout
            });

            if (response.ok) {
                await prisma.$transaction(async (tx) => {
                    await tx.$executeRaw`
                        UPDATE alert_deliveries
                        SET status = 'SENT', sent_at = NOW(), lock_token = NULL
                        WHERE id = ${row.id} AND lock_token = ${lockToken};
                    `;

                    if (row.incident_id) {
                        await tx.$executeRaw`
                            UPDATE incidents
                            SET last_sent_epoch = ${row.epoch},
                                last_notified_at = NOW()
                            WHERE id = ${row.incident_id};
                        `;
                    }
                });
                console.log(`[Outbox] Alert ${row.kind} sent to ${host}`);
            } else if (response.status === 429) {
                // rate limit reached
                const retryAfter = Number(response.headers.get("Retry-After")) || 10;
                const nextAttempt = new Date(Date.now() + retryAfter * 1000);

                await prisma.$executeRaw`
                    UPDATE alert_deliveries
                    SET status = 'PENDING', next_attempt_at = ${nextAttempt}, lock_token = NULL
                    WHERE id = ${row.id} AND lock_token = ${lockToken};
                `;
                console.warn(`[Outbox] 429 Rate Limit from ${host}. Backing off for ${retryAfter}s.`);
            } else if (response.status >= 400 && response.status < 500) {
                // 4XX error
                // Revoked token or webhook url -> dead immediately
                const errText = await response.text();
                await prisma.$executeRaw`
                    UPDATE alert_deliveries
                    SET status = 'DEAD', last_error = ${`HTTP ${response.status}: ${errText.slice(0, 150)}`}, lock_token = NULL
                    WHERE id = ${row.id} AND lock_token = ${lockToken};
                `;
                console.error(`[Outbox] Alert ${row.id} marked DEAD: Bad Webhook (${host} ${response.status}):`, errText);
            } else {
                // 5XX error : Host outrage
                // exponential backoff with jitter for one hour
                const backoffMs =
                    Math.min(3600000, 5000 * Math.pow(2, row.attempts)) + Math.floor(Math.random() * 2000);
                const nextAttempt = new Date(Date.now() + backoffMs);

                await prisma.$executeRaw`
                    UPDATE alert_deliveries
                    SET status = ${row.attempts >= 8 ? "DEAD" : "PENDING"}::"DeliveryStatus",
                        next_attempt_at = ${nextAttempt},
                        last_error = ${`HTTP ${response.status} from ${host}`},
                        lock_token = NULL
                    WHERE id = ${row.id} AND lock_token = ${lockToken};
                `;
            }
        } catch (error) {
            const backoffMs = Math.min(3600000, 5000 * Math.pow(2, row.attempts));
            const nextAttempt = new Date(Date.now() + backoffMs);

            await prisma.$executeRaw`
                UPDATE alert_deliveries
                SET status = 'PENDING', next_attempt_at = ${nextAttempt}, lock_token = NULL,
                    last_error = ${(error as Error).message}
                WHERE id = ${row.id} AND lock_token = ${lockToken};
            `;
        }

        // Sleep 1 second between dispatches to respect Slack/Discord rate limits!
        await new Promise((r) => setTimeout(r, 1000));
    }
}

// incident recovery (run every minute)
export async function resolveQuietIncidents() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes of silence

    // Atomically find & resolve incidents that have been quiet for 15 minutes
    const resolvedIncidents = await prisma.$queryRaw<Array<{
        id: string;
        queue_name: string;
        error_fingerprint: string;
        epoch: number;
        last_sent_epoch: number;
    }>>`
        WITH quiet_incidents AS (
            UPDATE incidents
            SET status = 'RESOLVED'
            WHERE status = 'OPEN'
              AND last_seen_at < ${cutoff}
            RETURNING id, queue_name, error_fingerprint, epoch, last_sent_epoch
        )
        SELECT * FROM quiet_incidents
        WHERE last_sent_epoch = epoch; -- ONLY alert if we actually alerted earlier during this epoch!
    `;

    for (const inc of resolvedIncidents) {
        const dedupeKey = `${inc.id}:${inc.epoch}:RECOVERED`;
        const payload = {
            event: "RECOVERED",
            incidentId: inc.id,
            queueName: inc.queue_name,
            errorFingerprint: inc.error_fingerprint,
            reason: "No new failures detected for 15 continuous minutes. Incident marked as resolved.",
            timestamp: new Date().toISOString(),
        };

        await prisma.$executeRaw`
            INSERT INTO alert_deliveries (
                id, incident_id, epoch, dedupe_key, kind, payload, status, next_attempt_at, created_at
            ) VALUES (
                gen_random_uuid(), ${inc.id}, ${inc.epoch}, ${dedupeKey},
                'RECOVERED'::"AlertKind", ${JSON.stringify(payload)}::jsonb,
                'PENDING'::"DeliveryStatus", NOW(), NOW()
            )
            ON CONFLICT (dedupe_key) DO NOTHING;
        `;
    }
}

// Background Polling Service (Non-Overlapping Chained Timer)
let isRunning = false;
let stopRequested = false;

export function startOutboxWorker() {
    if (isRunning) return;
    isRunning = true;
    stopRequested = false;

    console.log("[Outbox] Background alert delivery worker started.");

    async function poll() {
        if (stopRequested) return;
        try {
            await sweepOutboxOnce();
        } catch (err) {
            console.error("[Outbox] Sweep error:", err);
        } finally {
            if (!stopRequested) {
                setTimeout(poll, 3000); // Poll every 3 seconds without overlapping!
            }
        }
    }

    // Start outbox poller
    poll();

    // Start 60-second recovery resolver
    setInterval(async () => {
        if (stopRequested) return;
        try {
            await resolveQuietIncidents();
        } catch (err) {
            console.error("[Outbox Resolver] Error:", err);
        }
    }, 60000);
}

export function stopOutboxWorker() {
    stopRequested = true;
    isRunning = false;
}
