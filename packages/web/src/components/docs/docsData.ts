export type DocStep = {
    id: string;
    stepNumber: number;
    title: string;
    description: string;
    code?: { language: string; filename?: string; code: string };
};

export type DocSection = {
    id: string;
    title: string;
    category: "Getting Started" | "Worker SDK" | "Terminal CLI" | "Security & DLP" | "Triage & Intelligence" | "Contributing";
    description: string;
    callout?: { type: "tip" | "warning" | "note"; title: string; text: string };
    steps: DocStep[];
    deepDive?: { id: string; title: string; paragraphs: string[] };
};

export const DOCS_SECTIONS: DocSection[] = [
    // =========================================================================
    // 1. QUICKSTART
    // =========================================================================
    {
        id: "quickstart",
        category: "Getting Started",
        title: "Quickstart (Setup Guide)",
        description: "Install the SDK via npm, wrap your BullMQ worker, and start capturing diagnostic traces.",
        callout: {
            type: "tip",
            title: "Zero Network Egress on Success",
            text: "JobInspector uses tail-based sampling (recording data in temporary memory and sending it over the network ONLY if a crash occurs). If your job completes successfully, the trace is discarded locally. Your network bill remains $0.",
        },
        steps: [
            {
                id: "install-sdk",
                stepNumber: 1,
                title: "Install the Worker SDK from npm",
                description: "Add the client package to your background worker service using npm or pnpm.",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: "npm install @job-inspector/sdk\n# or\npnpm add @job-inspector/sdk",
                },
            },
            {
                id: "wrap-worker",
                stepNumber: 2,
                title: "Wrap Your BullMQ Worker",
                description: "Wrap your processor function with wrapJob(). Outgoing HTTP fetch calls and custom checkpoints are automatically recorded in an in-memory ring buffer (a bounded 50-item list that drops old events to prevent memory leaks).",
                code: {
                    language: "typescript",
                    filename: "src/workers/invoiceWorker.ts",
                    code: `import { Worker } from "bullmq";
import { wrapJob, inspector } from "@job-inspector/sdk";

// Wrap your processor: HTTP calls & checkpoints are auto-recorded!
const worker = new Worker("invoices", wrapJob(async (job) => {
  inspector.checkpoint("Validating customer tax account");

  // Outgoing fetch calls are intercepted automatically:
  const response = await fetch("https://api.stripe.com/v1/charges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: job.data.amount }),
  });

  if (!response.ok) {
    throw new Error(\`Payment rejected with status \${response.status}\`);
  }
}));`,
                },
            },
            {
                id: "configure-env",
                stepNumber: 3,
                title: "Configure Environment Variables",
                description: "Provide the URL of your JobInspector server in your environment. The SDK flushes failure diagnostics only when an unhandled exception occurs.",
                code: {
                    language: "bash",
                    filename: ".env",
                    code: `INSPECTOR_INGESTION_URL="https://jobfailure-inspector.onrender.com/v1/events/failure"
INSPECTOR_API_KEY="insp_live_your_project_key"`,
                },
            },
        ],
        deepDive: {
            id: "execution-lifecycle",
            title: "What Happens During Execution?",
            paragraphs: [
                "1. When BullMQ picks up a job, the SDK initializes an isolated 50-slot circular memory buffer tied to that specific execution using Node.js AsyncLocalStorage (a native mechanism that keeps concurrent async tasks isolated so their logs never mix).",
                "2. When your code calls globalThis.fetch, the SDK records the URL, HTTP method, response status, and duration in milliseconds.",
                "3. If the job succeeds, the buffer is dropped immediately. If the job throws an error, the SDK scrubs credentials and flushes the 50-step timeline to your JobInspector server in under 5 milliseconds.",
            ],
        },
    },

    // =========================================================================
    // 2. TERMINAL CLI REFERENCE
    // =========================================================================
    {
        id: "terminal-cli",
        category: "Terminal CLI",
        title: "Terminal CLI Reference",
        description: "Complete guide to all terminal commands for inspecting, pulling, and replaying failures.",
        callout: {
            type: "note",
            title: "For Terminal Lovers",
            text: "You can inspect jobs, view side-by-side retry diffs, and download failure artifacts directly from your terminal without opening a web browser.",
        },
        steps: [
            {
                id: "cmd-list",
                stepNumber: 1,
                title: "List Recent Failures ('list')",
                description: "Renders a high-density colored ASCII table of recent failed jobs across all queues.",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: `# List recent failures across all queues
npx job-inspector list

# Filter by queue or failure status
npx job-inspector list --queue invoice --status FAILED --limit 20`,
                },
            },
            {
                id: "cmd-inspect",
                stepNumber: 2,
                title: "Inspect a Failure ('inspect <uuid>')",
                description: "Prints a full forensic report: incident classification, Attempt 1 vs Attempt 2 execution diff, timeline steps, and sanitized payload.",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: `npx job-inspector inspect 0befce2e-6cd8-42d4-ac06-68ed08d36f1a`,
                },
            },
            {
                id: "cmd-pull",
                stepNumber: 3,
                title: "Download Failure Bundle ('pull <uuid>')",
                description: "Exports a sanitized .replay.json artifact containing the failed payload and recorded external HTTP responses (mock fixtures).",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: `npx job-inspector pull 0befce2e-6cd8 --out ./debug-job.json`,
                },
            },
            {
                id: "cmd-replay",
                stepNumber: 4,
                title: "Replay Locally with Network Mocks ('replay')",
                description: "Boots your local worker file, injects the production payload, and stubs outgoing HTTP calls with recorded fixtures so third-party APIs (Stripe, Twilio) are never called twice.",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: `npx job-inspector replay --file ./debug-job.json --handler ./src/workers/invoice.ts

# Output:
# [Mock Agent] Intercepted POST https://api.stripe.com/charges ➔ Replying 504 Timeout
# ✔ CRASH REPRODUCED: Exact match with production failure!`,
                },
            },
            {
                id: "cmd-studio",
                stepNumber: 5,
                title: "Launch Local Studio Console ('studio')",
                description: "Opens the Sentry-grade web console on localhost:3000 against your local database (just like Prisma Studio).",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: `npx job-inspector studio`,
                },
            },
        ],
    },

    // =========================================================================
    // 3. WORKER SDK
    // =========================================================================
    {
        id: "worker-sdk",
        category: "Worker SDK",
        title: "Worker SDK & Boundary Tracing",
        description: "How the in-memory ring buffer, async context manager, and automated HTTP tracing operate.",
        callout: {
            type: "note",
            title: "What is Boundary Tracing?",
            text: "Boundary tracing intercepts the edges where your code speaks to external systems (HTTP endpoints and databases) without requiring you to manually write logger statements on every line.",
        },
        steps: [
            {
                id: "manual-checkpoints",
                stepNumber: 1,
                title: "Manual Checkpoints",
                description: "Call inspector.checkpoint() to record structured milestones with custom metadata. These appear as visual badges in the execution timeline.",
                code: {
                    language: "typescript",
                    filename: "examples/checkpoints.ts",
                    code: `// Add structured milestones anywhere in your worker or helper functions:
inspector.checkpoint("Step 1: Unzipping user archive", { fileCount: 42 });
inspector.checkpoint("Step 2: Converting images to WebP", { quality: 80 });

// If execution crashes later, all checkpoints are flushed in chronological order!`,
                },
            },
            {
                id: "auto-fetch",
                stepNumber: 2,
                title: "Automatic Fetch Interception",
                description: "The SDK automatically hooks globalThis.fetch. Any HTTP call made by your worker (or third-party SDKs like Stripe or Twilio) is measured for duration and response status.",
            },
        ],
        deepDive: {
            id: "async-isolation",
            title: "Async Context Isolation",
            paragraphs: [
                "In high-throughput workers, 20 or 50 jobs may be executing concurrently on the same Node.js thread while awaiting I/O operations.",
                "JobInspector uses Node's native AsyncLocalStorage to ensure that breadcrumbs from Job A never leak into Job B. Even if an async function calls 10 sub-modules deep, inspector.checkpoint() always appends to that specific job's memory buffer.",
            ],
        },
    },

    // =========================================================================
    // 4. SECURITY & DLP
    // =========================================================================
    {
        id: "security-dlp",
        category: "Security & DLP",
        title: "Client-Side Data Scrubbing (DLP)",
        description: "How passwords, Bearer tokens, and Stripe keys are scrubbed before leaving worker memory.",
        callout: {
            type: "warning",
            title: "Client-Side Execution",
            text: "Sanitization occurs in-memory on your worker machine BEFORE data is sent over the network. Unscrubbed credentials never hit the database or external networks.",
        },
        steps: [
            {
                id: "key-redaction",
                stepNumber: 1,
                title: "Sensitive Key-Name Redaction",
                description: "Any key matching sensitive patterns (password, token, secret, authorization, creditCard, apiKey, cookie, session) has its value replaced with [REDACTED].",
            },
            {
                id: "value-regex",
                stepNumber: 2,
                title: "Pattern-Based Value Masking",
                description: "Even if a developer puts a token in an innocent key (like note: 'sk_live_...'), regex tokenizers detect live Stripe keys and Bearer JWTs and redact them.",
            },
            {
                id: "circular-guard",
                stepNumber: 3,
                title: "Circular Reference & Memory Protection",
                description: "If an object contains a circular reference (where an object points back to itself), JobInspector uses a native WeakSet to detect the loop and tag it as [CIRCULAR], preventing call-stack crashes.",
            },
        ],
    },

    // =========================================================================
    // 5. TRIAGE & RETRY DIFFING
    // =========================================================================
    {
        id: "triage-diffing",
        category: "Triage & Intelligence",
        title: "Failure Triage & Retry Diffing",
        description: "Understanding the Compute-on-Read Diff Engine and Queue Blast Radius classifications.",
        callout: {
            type: "note",
            title: "The Retry Blindspot",
            text: "When Attempt 1 writes to the database and times out, Attempt 2 often crashes with a UniqueConstraintViolation. Standard loggers hide the original timeout, showing only the second error.",
        },
        steps: [
            {
                id: "retry-diff",
                stepNumber: 1,
                title: "Compute-on-Read Diffing",
                description: "When inspecting Attempt 2 or 3, JobInspector dynamically compares it against the earlier attempt. It detects root-cause shifts, duration changes, and async execution reordering.",
            },
            {
                id: "blast-radius",
                stepNumber: 2,
                title: "Queue Blast Radius Classifier",
                description: "Measures how many distinct jobs failed with this exact error in a 5-minute rolling window: SHARED_INCIDENT (3+ jobs affected, indicating an outage) vs REPEATED_SAME_ERROR (1 single job retrying, indicating a poison pill).",
            },
        ],
    },

    // =========================================================================
    // 6. CONTRIBUTING
    // =========================================================================
    {
        id: "contributing",
        category: "Contributing",
        title: "Contributing Guide",
        description: "How to contribute bug reports, documentation updates, and new queue adapters.",
        callout: {
            type: "tip",
            title: "Open Source",
            text: "JobInspector is distributed under the MIT License. Contributions of all sizes—from documentation fixes to new queue integrations—are warmly welcome.",
        },
        steps: [
            {
                id: "fork-repo",
                stepNumber: 1,
                title: "Fork & Clone the Repository",
                description: "Fork the repository on GitHub, clone your fork locally, and install dependencies using pnpm.",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: `git clone https://github.com/byte-curious/JobFailure_Inspector.git
cd JobFailure_Inspector
pnpm install`,
                },
            },
            {
                id: "make-changes",
                stepNumber: 2,
                title: "Create a Branch & Submit Pull Request",
                description: "Create a feature branch, make your changes, and open a Pull Request explaining what changed and why.",
                code: {
                    language: "bash",
                    filename: "terminal",
                    code: `git checkout -b feat/my-new-feature
git commit -m "feat(sdk): add support for X"
git push origin feat/my-new-feature`,
                },
            },
        ],
    },
];
