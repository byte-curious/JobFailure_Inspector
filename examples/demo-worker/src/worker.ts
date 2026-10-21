import { Worker } from "bullmq";
import { redisConfig } from "./config/redis.js";
import { wrapJob, inspector } from "@job-inspector/sdk";
import type { Job } from "bullmq";

const worker = new Worker(
    "invoice",
    wrapJob(async (job: Job) => {
        console.log("👉 Processing Job:", job.id);

        // 1. Manual checkpoint
        inspector.checkpoint("Step 1: Starting invoice pipeline");

        // 2. Real external HTTP fetch (Notice: ZERO manual checkpoints here!)
        console.log("Making external API request to JSONPlaceholder...");
        const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
        console.log("Response status received:", response.status);

        // 3. Intentionally crash right after the HTTP call!
        throw new Error("Failed to process invoice: Database write error");
    }),
    { connection: redisConfig }
);

worker.on("ready", () => console.log("✅ Worker connected and ready!"));
