import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeErrorMessage, generateErrorFingerprint } from "../src/utils/normalize.js";

describe("Error Normalizer & Fingerprinting", () => {
    it("should cluster identical errors with different dynamic IDs and IPs", () => {
        const msgA = "Connection timeout to user_98234 at 10.0.1.4:5432";
        const msgB = "Connection timeout to user_11204 at 10.0.1.8:5432";

        assert.equal(normalizeErrorMessage(msgA), normalizeErrorMessage(msgB));
        assert.equal(
            generateErrorFingerprint({ name: "TimeoutError", message: msgA, code: "ETIMEDOUT" }),
            generateErrorFingerprint({ name: "TimeoutError", message: msgB, code: "ETIMEDOUT" })
        );
    });

    it("should preserve distinct SQLSTATE codes (23505 vs 23503)", () => {
        const msgUnique = 'duplicate key value violates unique constraint (SQLSTATE 23505)';
        const msgForeignKey = 'foreign key violation (SQLSTATE 23503)';

        assert.notEqual(normalizeErrorMessage(msgUnique), normalizeErrorMessage(msgForeignKey));
        assert.match(normalizeErrorMessage(msgUnique), /23505/);
        assert.match(normalizeErrorMessage(msgForeignKey), /23503/);
    });

    it("should preserve HTTP/1.1 and 3-digit HTTP status codes", () => {
        const msg404 = "HTTP/1.1 404 Not Found on /api/v1/users";
        const msg503 = "HTTP/1.1 503 Service Unavailable on /api/v1/users";

        assert.notEqual(normalizeErrorMessage(msg404), normalizeErrorMessage(msg503));
        assert.match(normalizeErrorMessage(msg404), /HTTP\/1\.1 404/);
        assert.match(normalizeErrorMessage(msg503), /HTTP\/1\.1 503/);
    });

    it("should normalize URL query strings and UUIDs", () => {
        const msg = "GET https://api.stripe.com/charges?id=ch_123 for inv 7b92f7c0-272e-4b68-9a99-8cf073d7620e";
        const normalized = normalizeErrorMessage(msg);

        assert.equal(normalized, "GET https://api.stripe.com/charges?[QUERY] for inv [UUID]");
    });

    it("should incorporate error.code into the fingerprint", () => {
        const fpWithCode = generateErrorFingerprint({ name: "Error", message: "Timeout", code: "ETIMEDOUT" });
        const fpWithoutCode = generateErrorFingerprint({ name: "Error", message: "Timeout" });

        assert.notEqual(fpWithCode, fpWithoutCode, "Different error codes must produce different fingerprints");
    });
});
