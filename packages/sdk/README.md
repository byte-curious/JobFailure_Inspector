# @morpheus.live/sdk

> The in-memory flight recorder and diagnostic SDK for Node.js background jobs.

Zero telemetry network overhead on success. When a worker fails, JobInspector flushes a bounded 50-step execution trace, scrubs sensitive data client-side, and supports local replay with mocked network responses.

## Installation

```bash
npm install @morpheus.live/sdk

# or

pnpm add @morpheus.live/sdk
```

## Quickstart (BullMQ)

Wrap your existing BullMQ worker processor with `wrapJob()`. Your business logic remains unchanged.

```typescript
import { Worker } from "bullmq";
import { wrapJob, inspector } from "@morpheus.live/sdk";

const worker = new Worker(
  "invoices",
  wrapJob(async (job) => {
    // 1. Optional manual checkpoint
    inspector.checkpoint("Validating customer tax ID");

    // 2. Outgoing fetch calls are automatically intercepted
    const res = await fetch("https://api.stripe.com/v1/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: job.data.amount,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Payment gateway rejected with status ${res.status}`
      );
    }
  })
);
```

## Environment Variables

Add your project credentials to your worker's `.env` file:

```env
# JobInspector failure ingestion endpoint
INSPECTOR_INGESTION_URL="https://job-failure-inspector.vercel.app/v1/events/failure"

# Project API Key (available in your JobInspector project settings)
INSPECTOR_API_KEY="insp_live_your_project_key"
```

## Features

- **Zero Egress on Success:** Uses an in-memory circular RingBuffer with Node.js `AsyncLocalStorage`. Successful executions are discarded locally, and telemetry is flushed only on failure.
- **Client-Side Secret Redaction:** Scrubs sensitive values such as passwords, Bearer tokens, and Stripe keys before transmission, with `WeakSet`-based circular reference protection.
- **Retry Mutation Diffing:** Compares execution attempts side by side to highlight changes in execution steps and potential root-cause shifts.

## Documentation & Live Console

- **Platform Console:** [https://job-failure-inspector.vercel.app/console](https://job-failure-inspector.vercel.app/console)
- **Full Documentation:** [https://job-failure-inspector.vercel.app/docs](https://job-failure-inspector.vercel.app/docs)
- **GitHub Repository:** [byte-curious/JobFailure_Inspector](https://github.com/byte-curious/JobFailure_Inspector)

## License

MIT © JobInspector Contributors
