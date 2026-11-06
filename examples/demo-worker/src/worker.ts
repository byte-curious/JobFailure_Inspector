import { Worker } from "bullmq";
import { redisConfig } from "./config/redis.js";
import { wrapJob, inspector } from "@job-inspector/sdk";
import type { Job } from "bullmq";

console.log("⚡ Starting Worker and connecting to Redis...");

const worker = new Worker(
    "invoice",
    wrapJob(async (job: Job) => {
        console.log(`\n👉 [Worker] Processing Invoice Job ID: ${job.id}`);
        console.log("Job Payload:", JSON.stringify(job.data, null, 2));

        // 1. Manual Checkpoints
        inspector.checkpoint("Step 1: Starting customer validation");
        inspector.checkpoint("Step 2: Checking billing account status");

        // 2. Simulated outgoing external HTTP call (Zero-code auto-interception!)
        console.log("Making external API call to check service status...");
        await fetch("https://jsonplaceholder.typicode.com/todos/1");

        // 3. INTENTIONAL CRASH: A brand-new fatal error to trigger a new incident!
        console.log("Simulating fatal crash...");
        throw new Error("Stripe Fatal: API key has expired or was revoked (HTTP 401 Unauthorized)");
    },{
        ingestionUrl: "https://jobfailure-inspector.onrender.com/v1/events/failure"
    }),
    { connection: redisConfig }
);

// Worker Lifecycle Listeners
worker.on("ready", () => {
    console.log("✅ Worker connected to Redis and waiting for jobs on queue 'invoice'!");
});

worker.on("error", (err) => {
    console.error("❌ Worker Redis error:", err.message);
});

worker.on("failed", (job, err) => {
    console.log(`⚠️ Job ${job?.id} failed as expected: ${err.message}`);
});
