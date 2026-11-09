#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";

const program = new Command();
const API_URL = process.env.INSPECTOR_URL || "http://localhost:3000";

// Helper to get auth headers from CLI options or environment variable
function getAuthHeaders(options?: { key?: string }) {
    const key = options?.key || process.env.INSPECTOR_API_KEY;
    return {
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        "Content-Type": "application/json",
    };
}

program
    .name("job-inspector")
    .description("Flight Recorder & Triage CLI for background job failures")
    .version("0.1.0");

// COMMAND: list
program
    .command("list")
    .description("List recent job failures across queues")
    .option("-q, --queue <name>", "Filter by queue name")
    .option("-s, --status <status>", "Filter by status (FAILED, DEAD_LETTER, RESOLVED)")
    .option("-l, --limit <number>", "Number of jobs to display", "15")
    .option("-k, --key <key>", "Project API Key (insp_live_...)")
    .action(async (options) => {
        try {
            const url = new URL(`${API_URL}/v1/jobs`);
            if (options.queue) url.searchParams.set("queue", options.queue);
            if (options.status) url.searchParams.set("status", options.status);
            url.searchParams.set("limit", options.limit);

            const res = await fetch(url.toString(), {
                headers: getAuthHeaders(options),
            });
            if (!res.ok) {
                const err = await res.json() as any;
                console.error(chalk.red(`Failed to fetch jobs (${res.status}):`), err.message || err);
                return;
            }

            const { data, pagination }: any = await res.json();

            if (data.length === 0) {
                console.log(chalk.gray("\nNo matching job failures found.\n"));
                return;
            }

            console.log(
                chalk.bold(`\n⚡ JobInspector: Recent Failures (${pagination.totalCount} total)\n`)
            );

            const table = new Table({
                head: [
                    chalk.white("Status"),
                    chalk.white("Queue"),
                    chalk.white("External ID"),
                    chalk.white("Attempts"),
                    chalk.white("Latest Error"),
                    chalk.white("Duration"),
                    chalk.white("Job UUID"),
                ],
                colWidths: [10, 15, 14, 10, 32, 12, 38],
                style: { head: [], border: ["gray"] },
            });

            for (const job of data) {
                const statusColor =
                    job.status === "FAILED"
                        ? chalk.red.bold(job.status)
                        : job.status === "DEAD_LETTER"
                            ? chalk.yellow.bold(job.status)
                            : chalk.green(job.status);

                const err = job.latestAttempt
                    ? `${chalk.bold(job.latestAttempt.errorName)}: ${job.latestAttempt.errorMessage}`
                    : chalk.gray("Pruned (Warm Tier)");

                const duration = job.latestAttempt?.duration != null
                    ? `${job.latestAttempt.duration}ms`
                    : chalk.gray("-");

                table.push([
                    statusColor,
                    chalk.cyan(job.queueName),
                    chalk.white(job.externalJobId),
                    job.totalAttempts,
                    err.slice(0, 30),
                    chalk.greenBright(duration),
                    chalk.gray(job.id),
                ]);
            }

            console.log(table.toString());
            console.log(
                chalk.gray(`\nTo inspect a job run: npx job-inspector inspect <uuid>\n`)
            );
        } catch (error) {
            console.error(chalk.red("Error connecting to inspector server:"), (error as Error).message);
        }
    });

// COMMAND: inspect <jobId>
program
    .command("inspect <jobId>")
    .description("Forensic investigation and diff for a specific job failure")
    .option("-k, --key <key>", "Project API Key (insp_live_...)")
    .action(async (jobId, options) => {
        try {
            const res = await fetch(`${API_URL}/v1/jobs/${jobId}`, {
                headers: getAuthHeaders(options),
            });
            if (!res.ok) {
                console.error(chalk.red(`Failed to fetch job (${res.status}): Job not found.`));
                return;
            }

            const { job, attempts, diff, classification }: any = await res.json();

            // 1. Header Banner
            console.log(chalk.bold.bgRed.white("\n ⚡ JOB FORENSIC INSPECTOR "));
            console.log(chalk.bold(`\nJob ID: ${chalk.cyan(job.externalJobId)} (${job.id})`));
            console.log(`Queue: ${chalk.cyan(job.queueName)} | Total Attempts: ${chalk.yellow(job.totalAttempts)} | Status: ${chalk.red.bold(job.status)}\n`);

            // 2. Incident Classification (Blast Radius)
            if (classification) {
                const cat = classification.category;
                const badge =
                    cat === "SHARED_INCIDENT"
                        ? chalk.bgRed.white.bold(" SHARED_INCIDENT ")
                        : cat === "REPEATED_SAME_ERROR"
                            ? chalk.bgYellow.black.bold(" REPEATED_SAME_ERROR ")
                            : chalk.bgBlue.white.bold(" ISOLATED_OR_NEW_ERROR ");

                console.log(chalk.bold("┌─ INCIDENT CLASSIFICATION ─────────────────────────────────────────┐"));
                console.log(`│ Category: ${badge}`);
                console.log(`│ Distinct jobs failing in queue: ${chalk.yellow(classification.evidence.distinctJobsInQueueCount)} (Threshold: ${classification.evidence.threshold})`);
                console.log(`│ Prior occurrence on this job:   ${classification.evidence.sameErrorSeenInPriorAttempt ? chalk.yellow("YES") : chalk.green("NO")}`);
                console.log(`│ Evaluation Window:              Last ${classification.evidence.windowMinutes || 5} minutes`);
                console.log(chalk.bold("└───────────────────────────────────────────────────────────────────┘\n"));
            }

            // 3. Execution Diff (Attempt N vs Attempt M)
            if (diff && diff.hasBaseline) {
                console.log(chalk.bold("┌─ EXECUTION DIFF (Attempt " + diff.previousAttemptNumber + " vs Attempt " + diff.currentAttemptNumber + ") ─────────────────────────┐"));
                console.log(`│ Fingerprint Changed: ${diff.fingerprintChanged ? chalk.red("YES (Root cause shifted!)") : chalk.green("NO (Identical error)")}`);
                console.log(`│ Previous Error:      ${chalk.gray(diff.previousErrorName)}`);
                console.log(`│ Current Error:       ${chalk.bold(diff.currentErrorName)}`);
                console.log(`│ Duration Delta:      ${diff.durationDeltaMs != null ? chalk.yellow(diff.durationDeltaMs + "ms") : chalk.gray("N/A")}`);
                console.log(`│ Timeline Comparison: ${chalk.cyan(diff.timeline.scope)} (Outcome: ${chalk.bold(diff.timeline.outcome?.status || diff.timeline.reason)})`);
                console.log(chalk.bold("└───────────────────────────────────────────────────────────────────┘\n"));
            }

            // 4. Latest Attempt Timeline
            const latestAttempt = attempts[attempts.length - 1];
            if (latestAttempt && Array.isArray(latestAttempt.breadcrumbs) && latestAttempt.breadcrumbs.length > 0) {
                console.log(chalk.bold(`── Execution Timeline (${latestAttempt.breadcrumbs.length} breadcrumbs, ${latestAttempt.droppedBreadcrumbs || 0} dropped) ──`));
                for (const b of latestAttempt.breadcrumbs.slice(-10)) { // Show last 10 steps
                    const badge = b.category === "http" ? chalk.bgCyan.black(" HTTP ") : chalk.bgGray.white(" STEP ");
                    const status = b.data?.statusCode ? `[${b.data.statusCode}]` : "";
                    console.log(` ${badge} ${chalk.white(b.message)} ${chalk.yellow(status)}`);
                }
                console.log("");
            }

            // 5. Sanitized Payload
            if (latestAttempt && latestAttempt.payload) {
                console.log(chalk.bold("── Sanitized Payload ──"));
                console.log(chalk.gray(JSON.stringify(latestAttempt.payload, null, 2)));
                console.log("");
            }

        } catch (error) {
            console.error(chalk.red("CLI Error:"), (error as Error).message);
        }
    });



// COMMAND: pull <jobId> (Download Failure Bundle)
program
    .command("pull <jobId>")
    .description("Download a sanitized failure bundle (.replay.json) from the server")
    .option("-k, --key <key>", "Project API Key (insp_live_...)")
    .option("-o, --out <path>", "Output file path", "./failure-bundle.json")
    .action(async (jobId, options) => {
        try {
            console.log(chalk.cyan(`\n⚡ Fetching failure artifact for job ${jobId}...`));

            const res = await fetch(`${API_URL}/v1/jobs/${jobId}/replay-bundle`, {
                headers: getAuthHeaders(options),
            });
            
            if (!res.ok) {
                console.error(chalk.red(`Failed to fetch artifact (${res.status}): Job not found.`));
                return;
            }

            const bundle = await res.json() as any;
            const outputPath = path.resolve(process.cwd(), options.out);

            fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2), "utf-8");

            console.log(chalk.green(`✔ Successfully exported failure bundle to: ${chalk.bold(options.out)}`));
            console.log(chalk.gray(`Queue: ${bundle.job.queueName} | Error: ${bundle.error.name}`));
            console.log(chalk.gray(`HTTP Fixtures recorded: ${bundle.httpFixtures.length}`));
            console.log(
                chalk.white(`\nTo replay this job locally, run:\n`) +
                chalk.cyan(`npx job-inspector replay --file ${options.out}\n`)
            );
        } catch (err) {
            console.error(chalk.red("Error pulling failure bundle:"), (err as Error).message);
        }
    });

// COMMAND: replay --file <path> (Run Local Replay with Mocked Network Stubs)
program
    .command("replay")
    .description("Replay a failed job locally using the recorded HTTP fixtures")
    .requiredOption("-f, --file <path>", "Path to the .replay.json failure bundle")
    .action(async (options) => {
        try {
            const filePath = path.resolve(process.cwd(), options.file);
            if (!fs.existsSync(filePath)) {
                console.error(chalk.red(`File not found: ${options.file}`));
                return;
            }

            const bundle = JSON.parse(fs.readFileSync(filePath, "utf-8"));

            console.log(chalk.bold.bgMagenta.white("\n ⚡ JOBINSPECTOR LOCAL REPLAY RUNNER \n"));
            console.log(chalk.bold(`Job: ${chalk.cyan(bundle.job.externalJobId)} | Queue: ${chalk.cyan(bundle.job.queueName)}`));
            console.log(`Original Error: ${chalk.red(bundle.error.name + ": " + bundle.error.message)}`);
            console.log(chalk.gray(`Fixtures loaded: ${bundle.httpFixtures.length} external HTTP calls\n`));

            // STUB globalThis.fetch with the recorded fixtures!
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (input: any, init?: any) => {
                const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
                const method = init?.method?.toUpperCase() || "GET";

                // Match against recorded fixtures in the bundle
                const matchedFixture = bundle.httpFixtures.find((f: any) => f.url === url && f.method === method);

                if (matchedFixture) {
                    console.log(
                        chalk.green(`[Mock Agent] Intercepted ${method} ${url} ➔ Replying with recorded status ${matchedFixture.statusCode}`)
                    );
                    return new Response(JSON.stringify({ mock: "replayed_fixture", originalStatus: matchedFixture.statusCode }), {
                        status: matchedFixture.statusCode,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                console.warn(chalk.yellow(`[Mock Agent] Unmocked outgoing fetch to: ${url}. Passing through.`));
                return originalFetch(input, init);
            };

            console.log(chalk.bold("── Replaying Injected Payload ──"));
            console.log(chalk.gray(JSON.stringify(bundle.payload, null, 2)));

            console.log(chalk.green(`\n✔ Mock environment ready. You can now execute your worker handler against this payload.\n`));

            // Restore fetch
            globalThis.fetch = originalFetch;

        } catch (err) {
            console.error(chalk.red("Replay error:"), (err as Error).message);
        }
    });


// COMMAND 5: studio (Prisma Studio style: Open Web Console in Browser)
program
    .command("studio")
    .description("Open the JobInspector Sentry-grade web console in your browser (just like Prisma Studio)")
    .option("-p, --port <number>", "Port where the dashboard is served", "3000")
    .option("--browser", "Automatically open the default web browser", true)
    .action(async (options) => {
        const port = options.port || "3000";
        const studioUrl = `http://localhost:${port}`;

        console.log(chalk.bold.bgMagenta.white("\n ⚡ JOBINSPECTOR STUDIO \n"));
        console.log(`Studio Web Console: ${chalk.bold.cyan(studioUrl)}`);
        console.log(chalk.gray(`Press ${chalk.bold("Ctrl + C")} to stop.\n`));

        // Automatically open the user's default browser across Linux, macOS, and Windows!
        if (options.browser) {
            const startCmd =
                process.platform === "darwin"
                    ? `open ${studioUrl}`
                    : process.platform === "win32"
                    ? `start ${studioUrl}`
                    : `xdg-open ${studioUrl}`;

            exec(startCmd, (err) => {
                if (err) {
                    console.log(chalk.gray(`Open ${studioUrl} in your browser to view the console.`));
                }
            });
        }
    });

program.parse();
