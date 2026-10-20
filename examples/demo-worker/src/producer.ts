import { Queue } from "bullmq";
import { redisConfig } from "./config/redis.js";


const queue = new Queue("invoice", { connection: redisConfig })

async function addTestJob() {
    console.log("Adding testing job...");

    const job = await queue.add("generate-pdf-invoice", {
        invoiceId: "invoice_abc",
        customerId: "cust_abc",
        amountDollar: 123.99,
        items: ["product A", "product B"]
    },
        {
            // Configure retries: retry up to 2 times
            attempts: 2,
            backoff: {
                type: "fixed",
                delay: 2000, // wait 2 seconds before retry
            },
        }
    )
    console.log(`Job successfully created with ID: ${job.id}`);

    await queue.close();
}
addTestJob().catch((err) => {
    console.error("Failed to add job:", err);
    process.exit(1);
});
