import "dotenv/config";
import { Worker } from "bullmq";
import { wrapJob, inspector } from "@morpheus.live/sdk";

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
};

console.log("⚡ Starting BullMQ Worker with JobInspector Flight Recorder...");

// Wrap your processor: HTTP calls & checkpoints are auto-recorded in memory!
const worker = new Worker(
    "invoice-processing",
    wrapJob(async (job) => {
        console.log(`\n👉 Processing Job ID: ${job.id}`);
        console.log("Payload:", job.data);

        // 1. Manual Checkpoint
        inspector.checkpoint("Step 1: Validating customer tax identity", {
            taxJurisdiction: "US-CA",
        });

        // 2. Outgoing HTTP call (Auto-intercepted by JobInspector!)
        console.log("Contacting payment gateway...");
        const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
        console.log("Gateway response status:", response.status);

        // 3. Checkpoint before write
        inspector.checkpoint("Step 2: Preparing ledger entry");

        // Simulate an intentional crash to test the flight recorder:
        if (job.data.shouldFail) {
            throw new Error("PaymentGatewayTimeout: Connection dropped after 3000ms");
        }

        console.log("✔ Job processed successfully!");
    }),
    { connection }
);

worker.on("ready", () => console.log("✅ Worker connected to Redis and ready for jobs!"));
worker.on("failed", (job, err) => console.log(`⚠️ Expected Job Failure [${job?.id}]: ${err.message}`));
