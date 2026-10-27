import { useEffect, useRef, useState } from "react";

type LiveEvent = {
    type: "CONNECTED" | "NEW_FAILURE";
    data?: {
        jobId: string;
        externalJobId: string;
        queueName: string;
        attemptNumber: number;
        errorName: string;
        errorMessage: string;
        failedAt: string;
    };
};

export function useLiveStream(onNewFailure?: (event: LiveEvent) => void) {
    const [isConnected, setIsConnected] = useState(false);
    
    // Store callback in a ref to avoid reconnecting on every re-render!
    const callbackRef = useRef(onNewFailure);

    useEffect(() => {
        callbackRef.current = onNewFailure;
    }, [onNewFailure]);

    useEffect(() => {
        const eventSource = new EventSource("/v1/events/stream");

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const parsed: LiveEvent = JSON.parse(event.data);
                if (parsed.type === "CONNECTED") {
                    setIsConnected(true);
                } else if (parsed.type === "NEW_FAILURE") {
                    callbackRef.current?.(parsed);
                }
            } catch {
                // Ignore ping heartbeats
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
        };

        // Only disconnect when the component unmounts completely
        return () => {
            eventSource.close();
            setIsConnected(false);
        };
    }, []); //  EMPTY DEPENDENCY ARRAY! Only connect ONCE on mount!

    return { isConnected };
}
