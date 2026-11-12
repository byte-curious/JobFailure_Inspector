#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { pathToFileURL } from "node:url";

const program = new Command();

// Smart Default: Uses live cloud backend unless overridden by INSPECTOR_URL
const API_URL = process.env.INSPECTOR_URL || "https://jobfailure-inspector.onrender.com";
const CLOUD_CONSOLE_URL = "https://job-failure-inspector.vercel.app/console";

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
    .version("0.1.1");

// COMMAND 1: list
program
    .command("list")
    .description("List recent job failures across queues")
    .option("-q, --queue <name>", "Filter by queue name")
    .option("-s, --status <status>", "Filter by status (FAILED, DEAD_LETTER, RESOLVED)")
    .option("-l, --limit <number>", "Number of jobs to display", "15")
    .option("-k, --key <key>", "Project API Key (insp_live_...)")
    .action(async (options) => {
        try {
            console.log(chalk.gray(`Connecting to: ${API_URL}...`));
            const url = new URL(`${API_URL}/v1/jobs`);
            if (options.queue) url.searchParams.set("queue", options.queue);
            if (options.status) url.searchParams.set("status", options.status);
            url.searchParams.set("limit", options.limit);

            const res = await fetch(url.toString(), {
                headers: getAuthHeaders(options),
            });

            if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as any;
                console.error(chalk.red(`Failed to fetch jobs (${res.status}):`), err.message || res.statusText);
                return;
            }

            const { data, pagination }: any = await res.json();

            if (!data || data.length === 0) {
                console.log(chalk.gray("\nNo matching job failures found.\n"));
                return;
            }

            console.log(chalk.bold(`\n⚡ JobInspector: Recent Failures (${pagination.totalCount} total)\n`));

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
                colWidths: [10, 16, 14, 10, 32, 12, 38],
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
            console.log(chalk.gray(`\nTo inspect a job run: npx @morpheus.live/cli inspect <uuid>\n`));
        } catch (error) {
            console.error(chalk.red("CLI Error:"), (error as Error).message);
        }
    });

// COMMAND 2: inspect <jobId>
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

            console.log(chalk.bold.bgRed.white("\n ⚡ JOB FORENSIC INSPECTOR "));
            console.log(chalk.bold(`\nJob ID: ${chalk.cyan(job.externalJobId)} (${job.id})`));
            console.log(`Queue: ${chalk.cyan(job.queueName)} | Total Attempts: ${chalk.yellow(job.totalAttempts)} | Status: ${chalk.red.bold(job.status)}\n`);

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
                console.log(`│ Blast Radius: ${chalk.yellow(classification.evidence.distinctJobsInQueueCount)} distinct jobs in queue`);
                console.log(chalk.bold("└───────────────────────────────────────────────────────────────────┘\n"));
            }

            if (diff && diff.hasBaseline) {
                console.log(chalk.bold(`┌─ EXECUTION DIFF (Attempt ${diff.previousAttemptNumber} vs Attempt ${diff.currentAttemptNumber}) ─────────────────────────┐`));
                console.log(`│ Error Shift: ${diff.fingerprintChanged ? chalk.red("YES (Root cause shifted!)") : chalk.green("NO")}`);
                console.log(`│ Previous Error: ${chalk.gray(diff.previousErrorName)}`);
                console.log(`│ Current Error:  ${chalk.bold(diff.currentErrorName)}`);
                console.log(`│ Duration Delta: ${diff.durationDeltaMs != null ? chalk.yellow(diff.durationDeltaMs + "ms") : chalk.gray("N/A")}`);
                console.log(chalk.bold("└───────────────────────────────────────────────────────────────────┘\n"));
            }

            const latestAttempt = attempts[attempts.length - 1];
            if (latestAttempt && Array.isArray(latestAttempt.breadcrumbs) && latestAttempt.breadcrumbs.length > 0) {
                console.log(chalk.bold(`── Execution Timeline (${latestAttempt.breadcrumbs.length} steps) ──`));
                for (const b of latestAttempt.breadcrumbs.slice(-8)) {
                    const badge = b.category === "http" ? chalk.bgCyan.black(" HTTP ") : chalk.bgGray.white(" STEP ");
                    const status = b.data?.statusCode ? `[${b.data.statusCode}]` : "";
                    console.log(` ${badge} ${chalk.white(b.message)} ${chalk.yellow(status)}`);
                }
                console.log("");
            }

            if (latestAttempt?.payload) {
                console.log(chalk.bold("── Sanitized Payload ──"));
                console.log(chalk.gray(JSON.stringify(latestAttempt.payload, null, 2)));
                console.log("");
            }
        } catch (error) {
            console.error(chalk.red("CLI Error:"), (error as Error).message);
        }
    });

// COMMAND 3: pull <jobId>
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
                chalk.cyan(`npx @morpheus.live/cli replay --file ${options.out}\n`)
            );
        } catch (err) {
            console.error(chalk.red("Error pulling failure bundle:"), (err as Error).message);
        }
    });

// COMMAND 4: replay
program
    .command("replay")
    .description("Replay a failed job locally using the recorded HTTP fixtures")
    .requiredOption("-f, --file <path>", "Path to the .replay.json failure bundle")
    .option("-h, --handler <path>", "Path to your local worker handler file")
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

            // STUB globalThis.fetch with the recorded fixtures
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async (input: any, init?: any) => {
                const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
                const method = init?.method?.toUpperCase() || "GET";

                const matchedFixture = bundle.httpFixtures.find((f: any) => f.url === url && f.method === method);

                if (matchedFixture) {
                    console.log(
                        chalk.green(`[Mock Agent] Intercepted ${method} ${url} ➔ Replying with recorded status ${matchedFixture.statusCode}`)
                    );
                    return new Response(JSON.stringify({ mock: "replayed_fixture", status: matchedFixture.statusCode }), {
                        status: matchedFixture.statusCode,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                console.warn(chalk.yellow(`[Mock Agent] Unmocked outgoing fetch to: ${url}. Passing through.`));
                return originalFetch(input, init);
            };

            if (options.handler) {
                const handlerPath = path.resolve(process.cwd(), options.handler);
                if (!fs.existsSync(handlerPath)) {
                    console.error(chalk.red(`Worker handler file not found: ${options.handler}`));
                    return;
                }

                const handlerUrl = pathToFileURL(handlerPath).href;
                const workerModule = await import(handlerUrl);
                const workerFn = workerModule.handler || workerModule.process || workerModule.default;

                if (typeof workerFn !== "function") {
                    console.error(chalk.red(`No exported function found in ${options.handler}.`));
                    return;
                }

                console.log(chalk.bold("── Executing Local Handler with Failed Payload ──\n"));

                const mockJob = {
                    id: bundle.job.externalJobId,
                    name: bundle.job.queueName,
                    queueName: bundle.job.queueName,
                    data: bundle.payload,
                    attemptsMade: bundle.job.attemptNumber - 1,
                };

                try {
                    await workerFn(mockJob);
                    console.log(chalk.green.bold("\n🎉 BUGFIX VERIFIED: Local handler executed without throwing!"));
                } catch (reproducedErr: any) {
                    console.log(chalk.red.bold("\n✖ REPLAY CRASH DETECTED:"));
                    console.log(chalk.red(`  ${reproducedErr.name}: ${reproducedErr.message}\n`));
                    if (reproducedErr.name === bundle.error.name) {
                        console.log(chalk.yellow("  👉 Exact match with production failure!\n"));
                    }
                }
            } else {
                console.log(chalk.bold("── Injected Payload Ready ──"));
                console.log(chalk.gray(JSON.stringify(bundle.payload, null, 2)));
                console.log(chalk.green("\n✔ Mock environment ready. Pass --handler <path> to execute local worker.\n"));
            }

            globalThis.fetch = originalFetch;
        } catch (err) {
            console.error(chalk.red("Replay error:"), (err as Error).message);
        }
    });

// COMMAND 5: studio (Smart Auto-Detection: Localhost or Live Vercel Console)
program
    .command("studio")
    .description("Open the JobInspector web console in your browser (Localhost or Cloud)")
    .option("-p, --port <number>", "Local port to check", "3000")
    .option("-k, --key <key>", "Project API Key (insp_live_...) to open your private workspace")
    .action(async (options) => {
        const localUrl = `http://localhost:${options.port}`;
        let targetUrl = CLOUD_CONSOLE_URL;

        if (options.key) {
            targetUrl = `${CLOUD_CONSOLE_URL}?key=${encodeURIComponent(options.key)}`;
        }

        console.log(chalk.bold.bgMagenta.white("\n ⚡ JOBINSPECTOR STUDIO \n"));

        try {
            const check = await fetch(`${localUrl}/v1/jobs`, { signal: AbortSignal.timeout(600) });
            if (check.ok || check.status === 401) {
                targetUrl = options.key ? `${localUrl}?key=${encodeURIComponent(options.key)}` : localUrl;
                console.log(`✔ Connected to local server on ${chalk.bold.cyan(localUrl)}`);
            }
        } catch {
            console.log(chalk.yellow(`ℹ No local server running on ${localUrl}.`));
            console.log(chalk.green(`✔ Opening live console: ${chalk.bold.cyan(targetUrl)}`));
        }

        console.log(chalk.gray(`Press ${chalk.bold("Ctrl + C")} to stop.\n`));

        const startCmd =
            process.platform === "darwin"
                ? `open "${targetUrl}"`
                : process.platform === "win32"
                ? `start "${targetUrl}"`
                : `xdg-open "${targetUrl}"`;

        exec(startCmd);
    });

program.parse();
