import { executionContext, addBreadcrumb } from "../context.js";

const originalFetch = globalThis.fetch;
let isHttpIntercepted = false;

function extractURLandMethod(input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) {
    let url = input;
    let method = init?.method?.toUpperCase() || "GET";

    if (typeof input == "string") {
        url = input;
    } else if (input instanceof URL) url = input.toString();
    else if (typeof input == "object" && "url" in input) {
        url = input.url,
            method = input.method?.toUpperCase() || method
    }
    return { url, method };
}

export function enableHttpInterception(): void {
    if (isHttpIntercepted) return;
    isHttpIntercepted = true;

    globalThis.fetch = async function (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit): Promise<Response> {

        // 1. If not inside an active job, run native fetch untouched
        const store = executionContext.getStore();
        if (!store) {
            return originalFetch(input, init);
        };

        //  Is there an active job in <AsyncLocalStorage> ? Yes
        // then
        const { url, method } = extractURLandMethod(input, init);
        const startTimer = Date.now();
        try {
            // 2. Execute original fetch
            const response = await originalFetch(input, init);
            const durationMs = Date.now() - startTimer;
            // 3. Record breadcrumb on success response (even for 4xx/5xx status codes!)

            addBreadcrumb("http", `${method} ${url} [${response.status}]`, {
                url,
                method,
                durationMs,
                statusCode: response.status,
            });

            return response;

        } catch (error) {
            const durationMs = Date.now() - startTimer;
            // 4. Record breadcrumb if the network request itself crashed (e.g. DNS failure, timeout)
            addBreadcrumb("http", `${method} ${url} [FAILED]`, {
                url,
                method,
                error: error instanceof Error? error.message : "Network Error",
                durationMs
            });
            // Re-throw so developer's try/catch still catches it
            throw error;
        }
    }
}

