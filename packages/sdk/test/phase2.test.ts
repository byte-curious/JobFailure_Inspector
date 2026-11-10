import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RingBuffer } from "../src/ring-buffer.js";
import { sanitize } from "../src/sanitizer.js";
import { executionContext, addBreadcrumb, inspector } from "../src/context.js";
import type { Breadcrumb, JobContext } from "../src/context.js";

describe("Phase 2 Rigorous Test Suite", () => {

    // ==========================================
    // 1. RING BUFFER TESTS
    // ==========================================
    describe("RingBuffer", () => {
        it("should maintain strict chronological order when overflowing", () => {
            const buffer = new RingBuffer<number>(3); // Small capacity for easy testing

            buffer.push(1);
            buffer.push(2);
            buffer.push(3);
            buffer.push(4); // Overwrites 1 -> buffer has [2, 3, 4]
            buffer.push(5); // Overwrites 2 -> buffer has [3, 4, 5]

            const result = buffer.toArray();
            assert.deepEqual(result, [3, 4, 5], "Oldest items must be dropped, latest kept in order");
            assert.equal(buffer.size, 3);
        });

        it("should return clean array without undefineds when partially filled", () => {
            const buffer = new RingBuffer<string>(50);
            buffer.push("A");
            buffer.push("B");

            const result = buffer.toArray();
            assert.deepEqual(result, ["A", "B"]);
            assert.equal(result.length, 2);
        });

        it("should throw error on invalid capacity", () => {
            assert.throws(() => new RingBuffer(0), /positive integer/);
            assert.throws(() => new RingBuffer(-5), /positive integer/);
        });
    });

    // ==========================================
    // 2. SANITIZER TESTS
    // ==========================================
    describe("Sanitizer", () => {
        it("should handle circular references without crashing", () => {
            const circularObj: any = { name: "test" };
            circularObj.self = circularObj;

            // Must NOT throw "Maximum call stack size exceeded"
            assert.doesNotThrow(() => {
                const sanitized = sanitize(circularObj) as any;
                assert.equal(sanitized.name, "test");
                assert.equal(sanitized.self, "[CIRCULAR]");
            });
        });

        it("should guard against deep recursion", () => {
            let deepObj: any = { level: 0 };
            let current = deepObj;
            for (let i = 1; i <= 12; i++) {
                current.next = { level: i };
                current = current.next;
            }

            const sanitized = sanitize(deepObj) as any;
            // Traverse to depth 9
            let cur = sanitized;
            for (let i = 0; i < 9; i++) {
                cur = cur.next;
            }
            assert.equal(cur, "[MAX_DEPTH_REACHED]");
        });

        it("should redact case-insensitive sensitive keys", () => {
            const payload = {
                PASSword: "secret123",
                Api_Key: "12345",
                authorization: "Bearer dummy",
                Credit_Card: "1111-2222-3333-4444",
                safeField: "keep-me",
            };

            const sanitized = sanitize(payload) as any;
            assert.equal(sanitized.PASSword, "[REDACTED]");
            assert.equal(sanitized.Api_Key, "[REDACTED]");
            assert.equal(sanitized.authorization, "[REDACTED]");
            assert.equal(sanitized.Credit_Card, "[REDACTED]");
            assert.equal(sanitized.safeField, "keep-me");
        });

        it("should redact unlabeled secret values matching regex", () => {
            const payload = {
                randomKey: ["sk", "live", "981273981273891273891273"].join("_"),
                anotherRandomKey: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature",
            };

            const sanitized = sanitize(payload) as any;
            assert.equal(sanitized.randomKey, "[REDACTED]");
            assert.equal(sanitized.anotherRandomKey, "[REDACTED]");
        });
    });

    // ==========================================
    // 3. ASYNC CONTEXT ISOLATION (CONCURRENCY)
    // ==========================================
    describe("AsyncLocalStorage Concurrency Isolation", () => {
        it("should not leak breadcrumbs between parallel running jobs", async () => {
            const bufferA = new RingBuffer<Breadcrumb>(10);
            const bufferB = new RingBuffer<Breadcrumb>(10);

            const contextA: JobContext = { jobId: "job_A", queueName: "q", breadcrumbs: bufferA };
            const contextB: JobContext = { jobId: "job_B", queueName: "q", breadcrumbs: bufferB };

            // Simulate Job A and Job B running concurrently with interleaved async delays
            const taskA = executionContext.run(contextA, async () => {
                inspector.checkpoint("Job A - Step 1");
                await new Promise((r) => setTimeout(r, 50)); // Artificial async delay
                inspector.checkpoint("Job A - Step 2");
            });

            const taskB = executionContext.run(contextB, async () => {
                inspector.checkpoint("Job B - Step 1");
                await new Promise((r) => setTimeout(r, 20)); // Interleaved delay
                inspector.checkpoint("Job B - Step 2");
            });

            await Promise.all([taskA, taskB]);

            const breadcrumbsA = bufferA.toArray().map((b) => b.message);
            const breadcrumbsB = bufferB.toArray().map((b) => b.message);

            // Assert Job A ONLY contains Job A's logs
            assert.deepEqual(breadcrumbsA, ["Job A - Step 1", "Job A - Step 2"]);
            // Assert Job B ONLY contains Job B's logs
            assert.deepEqual(breadcrumbsB, ["Job B - Step 1", "Job B - Step 2"]);
        });

        it("should gracefully no-op if checkpoint is called outside worker context", () => {
            assert.doesNotThrow(() => {
                inspector.checkpoint("Outside any job");
            });
        });
    });
});
