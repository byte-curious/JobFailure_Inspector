// 1. Added 'cookie' and 'session' to sensitive keys
const SENSITIVE_KEY_REGEX =
    /pass(word)?|token|secret|auth(orization)?|api[_-]?key|credit[_-]?card|cvv|ssn|private[_-]?key|cookie|session/i;

const STRIPE_SECRET_REGEX = /^sk_live_[0-9a-zA-Z]{24,}/;
const BEARER_TOKEN_REGEX = /^Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/;

export function sanitize(
    value: unknown,
    seen = new WeakSet<object>(),
    depth = 0
): unknown {
    // 1. Guard against extreme nesting
    if (depth > 8) return "[MAX_DEPTH_REACHED]";
    if (value === null || value === undefined) return value;

    // 2. Handle Strings (Value-Pattern Matching + Truncation)
    if (typeof value === "string") {
        if (STRIPE_SECRET_REGEX.test(value) || BEARER_TOKEN_REGEX.test(value)) {
            return "[REDACTED]";
        }
        // Truncate massive strings to prevent database bloat
        if (value.length > 1000) {
            return `${value.slice(0, 1000)}... [TRUNCATED ${value.length - 1000} chars]`;
        }
        return value;
    }

    // 3. Other Primitives (number, boolean)
    if (typeof value !== "object") {
        return value;
    }

    // 4. Handle Special Objects (BEFORE generic object loop!)
    // Date: preserve as ISO string
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Buffer: summarize without memory explosion
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
        return `[BUFFER: ${value.length} bytes]`;
    }

    // Error: preserve name and message
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
        };
    }

    // 5. Circular Reference Guard
    if (seen.has(value)) {
        return "[CIRCULAR]";
    }
    seen.add(value);

    // 6. Handle Arrays
    if (Array.isArray(value)) {
        return value.map((item) => sanitize(item, seen, depth + 1));
    }

    // 7. Handle Plain Objects
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
        if (SENSITIVE_KEY_REGEX.test(key)) {
            sanitizedObj[key] = "[REDACTED]";
        } else {
            // recursively call sanitize function again
            sanitizedObj[key] = sanitize(val, seen, depth + 1);
        }
    }

    return sanitizedObj;
}
