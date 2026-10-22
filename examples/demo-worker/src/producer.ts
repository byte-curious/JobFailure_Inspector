import { Queue } from "bullmq";
import { redisConfig } from "./config/redis.js";

const invoiceQueue = new Queue("invoice", { connection: redisConfig });

async function runChaosProducer() {
    console.log("⚡ [Chaos Producer] Queuing stress-test job...");

    const job = await invoiceQueue.add(
        "chaos-stress-test",
        {
            orderId: "ord_chaos_777",
            customerEmail: "alice@example.com", // Legitimate data (must NOT be redacted)

            // Sensitive keys (must be redacted)
            userPassword: "PlaintextPassword999!",
            apiKey: "sk_live_verySecretKey1234567890",
            billing: {
                creditCard: "4111-2222-3333-4444",
                securityCode: "123",
            },

            // Innocent key containing unlabeled Bearer token
            authorizationHeader: "Bearer eyJhbGciOiJIUzI1NiJ9.e30.dummySignature",
        },
        { attempts: 1 }
    );

    console.log(`✅ [Chaos Producer] Job queued successfully with ID: ${job.id}`);
    await invoiceQueue.close();
}

runChaosProducer().catch(console.error);
