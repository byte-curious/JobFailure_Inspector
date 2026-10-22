import { Worker } from "bullmq";
import { redisConfig } from "./config/redis.js";
import { wrapJob, inspector } from "@job-inspector/sdk";
import type { Job } from "bullmq";

console.log("⚡ Starting Chaos Worker...");

const worker = new Worker(
    "invoice",
    wrapJob(async (job: Job) => {
        console.log(`👉 [Worker] Processing Chaos Job ID: ${job.id}`);

        // 1. STRESS TEST: Push 65 checkpoints into a 50-item buffer
        // The first 15 (Step 0 to 14) MUST be dropped from memory!
        console.log("Pushing 65 checkpoints to test RingBuffer overflow...");
        for (let i = 0; i < 65; i++) {
            inspector.checkpoint(`Step ${i}: Processing batch item ${i}`);
        }

        // 2. STRESS TEST: Test circular reference in breadcrumb metadata
        console.log("Testing circular reference in breadcrumb...");
        const circularObj: any = { info: "Transaction state" };
        circularObj.self = circularObj; // Circular loop!
        inspector.checkpoint("Checkpoint with circular metadata", circularObj);

        // 3. STRESS TEST: External HTTP 404 Not Found
        console.log("Making external HTTP call that returns 404...");
        const res = await fetch("https://jsonplaceholder.typicode.com/posts/999999999");
        console.log("HTTP Status returned:", res.status);

        // 4. FATAL CRASH: Simulate unexpected failure
        throw new Error("Chaos Gauntlet Intended Crash: Database deadlocked on transaction commit");
    }),
    { connection: redisConfig }
);

worker.on("ready", () => console.log("✅ Chaos Worker connected to Redis!"));
worker.on("failed", (job, err) => {
    console.log(`⚠️ Expected Job Failure: ${err.message}`);
});
