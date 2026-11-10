# Basic BullMQ + JobInspector Starter

A clean, copyable starter project demonstrating `@morpheus.live/sdk` with BullMQ.

## Quickstart

1. **Install dependencies:**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Configure your `.env`:**
   \`\`\`bash
   cp .env.example .env
   # Add your INSPECTOR_API_KEY from https://job-failure-inspector.vercel.app/console -> Settings
   \`\`\`

3. **Start the worker:**
   \`\`\`bash
   pnpm worker
   \`\`\`

4. **Trigger a job in another terminal:**
   \`\`\`bash
   pnpm produce
   \`\`\`

5. **Inspect the crash:**
   Open [job-failure-inspector.vercel.app](https://job-failure-inspector.vercel.app) to view the execution diff, breadcrumbs, and sanitized payload!
