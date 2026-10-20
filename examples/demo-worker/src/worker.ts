import { Worker } from "bullmq";
import { redisConfig } from "./config/redis.js";
import {wrapJob} from "@job-inspector/sdk"
import type { Job } from "bullmq";

const worker = new Worker("invoice", wrapJob(async(job:Job)=>{
    console.log("Processing Invoice...", job.id);
    // Intentionally throw an error to simulate a real failure!
    throw new Error("Stripe Gateway Timeout: Failed to process payment");
}), {connection: redisConfig})
