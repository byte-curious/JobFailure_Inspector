import { Queue } from "bullmq";
import { redisConfig } from "./config/redis.js";

const invoiceQueue = new Queue("invoice", { connection: redisConfig });

async function addFailingJob() {
    console.log("⚡ [Producer] Queuing test job to Redis...");

    const job = await invoiceQueue.add(
        "generate-invoice",
        {
            invoiceId: "inv_fresh_999",
            customerEmail: "developer@example.com",
            // Sensitive fields that our SDK will automatically redact:
            apiKey: "sk_live_verySecretKey1234567890",
            userPassword: "MyPlaintextPassword!",
            billing: {
                creditCard: "4111-2222-3333-4444",
                securityCode: "999",
            },
        },
        {
            // Retries configuration:
            attempts: 1, // Final attempt immediately!
        }
    );

    console.log(`✅ [Producer] Job successfully enqueued with ID: ${job.id}`);
    await invoiceQueue.close();
}

addFailingJob().catch((err) => {
    console.error("❌ Failed to enqueue job:", err);
    process.exit(1);
});
