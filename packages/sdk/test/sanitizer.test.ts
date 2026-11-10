import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitize } from "../src/sanitizer.js";

describe("Production Sanitizer Edge Cases", () => {
    it("should preserve Date instances as ISO strings instead of empty objects", () => {
        const now = new Date("2026-03-01T12:00:00.000Z");
        const payload = { createdAt: now };

        const result = sanitize(payload) as any;
        assert.equal(result.createdAt, "2026-03-01T12:00:00.000Z");
    });

    it("should safely summarize Buffers without memory explosion", () => {
        const buffer = Buffer.from("Hello World, this is a binary payload");
        const payload = { file: buffer };

        const result = sanitize(payload) as any;
        assert.match(result.file, /\[BUFFER: \d+ bytes\]/);
    });

    it("should safely serialize Error objects inside payloads", () => {
        const payload = { lastError: new Error("Network timeout") };

        const result = sanitize(payload) as any;
        assert.equal(result.lastError.name, "Error");
        assert.equal(result.lastError.message, "Network timeout");
    });

    it("should truncate massive strings to prevent database bloat", () => {
        const hugeString = "A".repeat(5000);
        const payload = { data: hugeString };

        const result = sanitize(payload) as any;
        assert.ok(result.data.length < 1200);
        assert.match(result.data, /\[TRUNCATED/);
    });

    it("should redact cookies and session tokens", () => {
        const payload = {
            cookie: "sessionId=xyz123; HttpOnly",
            "set-cookie": "token=abc",
            "x-api-key": "secret-123",
            userSession: "sess_999",
        };

        const result = sanitize(payload) as any;
        assert.equal(result.cookie, "[REDACTED]");
        assert.equal(result["set-cookie"], "[REDACTED]");
        assert.equal(result["x-api-key"], "[REDACTED]");
        assert.equal(result.userSession, "[REDACTED]");
    });
});
