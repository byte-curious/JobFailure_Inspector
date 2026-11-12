# @morpheus.live/cli

> The terminal triage tool and diagnostic local replay runner for background job failures.

Inspect failed background jobs, compare execution attempts, download failure artifacts, and reproduce production failures locally from your terminal.

## Quickstart

Run commands instantly using `npx`, without installing the CLI globally.

### List Recent Failures

```bash
npx @morpheus.live/cli list
```

## Commands

### 1. List Failures

List failures across queues, optionally filtering by queue name and failure status.

```bash
npx @morpheus.live/cli list --queue invoice --status FAILED
```

### 2. Forensic Inspection

Inspect a specific failed job, including its incident classification, execution timeline, retry differences, and diagnostic information.

```bash
npx @morpheus.live/cli inspect <job-uuid>
```

### 3. Download Failure Artifact

Download a failure artifact (`.replay.json`) containing the information required for local debugging.

```bash
npx @morpheus.live/cli pull <job-uuid> --out ./debug-job.json
```

### 4. Local Replay with Network Stubs

Replay a failed job against your local worker handler using recorded HTTP fixtures to help prevent unintended calls to external services.

```bash
npx @morpheus.live/cli replay --file ./debug-job.json --handler ./src/worker.ts
```

### 5. Launch Studio in Browser

Launch the JobInspector Studio interface in your default browser.

```bash
npx @morpheus.live/cli studio
```

## Documentation & Live Console

- **Platform Console:** [https://job-failure-inspector.vercel.app/console](https://job-failure-inspector.vercel.app/console)
- **Documentation:** [https://job-failure-inspector.vercel.app/docs](https://job-failure-inspector.vercel.app/docs)
- **GitHub Repository:** [byte-curious/JobFailure_Inspector](https://github.com/byte-curious/JobFailure_Inspector)

## License

MIT © JobInspector Contributors
