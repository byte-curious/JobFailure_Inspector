import "dotenv/config";
import { Queue } from "bullmq";

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
};

const queue = new Queue("invoice-processing", { connection });

async function main() {
    console.log("⚡ Enqueuing test job with failure trigger...");

    const job = await queue.add(
        "process-invoice",
        {
            invoiceId: "inv_example_9912",
            amountCents: 4999,
            customerEmail: "user@example.com",
            shouldFail: true, // Triggers intentional failure for demonstration!
            // Sensitive fields that will be automatically redacted:
            apiKey: "sk_live_verySecretKey123",
            userPassword: "PlaintextPassword123!",
        },
        {
            attempts: 2, // Demonstrates retry diffing!
            backoff: { type: "fixed", delay: 2000 },
        }
    );

    console.log(`✅ Job enqueued with ID: ${job.id}`);
    await queue.close();
}

main().catch(console.error);
