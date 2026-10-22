const SENSITIVE_KEY_REGEX = 
    /pass(word)?|token|secret|auth(orization)?|api[_-]?key|credit[_-]?card|cvv|ssn|private[_-]?key/i;

const STRIPE_SECRET_REGEX = /^sk_live_[0-9a-zA-Z]{24,}/;
const BEARER_TOKEN_REGEX = /^Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/;

export function sanitize(
    value: unknown,
    seen = new WeakSet<object>(),
    depth = 0
): unknown {
    // 1. Guard against extreme nesting or circular references
    if (depth > 8) return "[MAX_DEPTH_REACHED]";
    if (value === null || value === undefined) return value;

    // 2. Handle Strings (Value-Pattern Matching)
    if (typeof value === "string") {
        if (STRIPE_SECRET_REGEX.test(value) || BEARER_TOKEN_REGEX.test(value)) {
            return "[REDACTED]";
        }
        return value;
    }

    // 3. Other Primitives (number, boolean)
    if (typeof value !== "object") {
        return value;
    }

    // 4. Circular Reference Guard
    if (seen.has(value)) {
        return "[CIRCULAR]";
    }
    seen.add(value);

    // 5. Handle Arrays
    if (Array.isArray(value)) {
        return value.map((item) => sanitize(item, seen, depth + 1));
    }

    // 6. Handle Objects
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
        if (SENSITIVE_KEY_REGEX.test(key)) {
            sanitizedObj[key] = "[REDACTED]";
        } else {
            sanitizedObj[key] = sanitize(val, seen, depth + 1);
        }
    }

    return sanitizedObj;
}

