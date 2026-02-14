import useSWR from "swr";
import { NodeData } from "@/types";
import { POLLING_CONFIG } from "@/lib/constants";
import { useUIStore } from "@/lib/stores/uiStore";

/**
 * Custom API Error Class
 * ✅ TAHAP 3: Enhanced error handling with HTTP status codes
 */
export class APIError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public response?: any
    ) {
        super(message);
        this.name = 'APIError';
        Object.setPrototypeOf(this, APIError.prototype);
    }
}

/**
 * SWR Fetcher with AbortController support
 * ✅ TAHAP 3: Enhanced error handling and request cancellation
 */
const fetcher = async (url: string, signal?: AbortSignal) => {
    try {
        const res = await fetch(url, { signal });

        if (!res.ok) {
            // Try to parse error response
            const errorData = await res.json().catch(() => ({}));
            throw new APIError(
                errorData.error || `HTTP ${res.status}: ${res.statusText}`,
                res.status,
                errorData
            );
        }

        const data = await res.json();

        // Check if response has a message (indicating config issue)
        if (data.message) {
            return {
                data: data.data || [],
                message: data.message,
                isConfigError: true,
            };
        }

        return { data: data.data || [], isConfigError: false };
        
    } catch (error) {
        // Re-throw APIError as-is
        if (error instanceof APIError) {
            throw error;
        }
        
        // Handle AbortError
        if (error instanceof Error && error.name === 'AbortError') {
            throw new APIError('Request cancelled', 0, { aborted: true });
        }
        
        // Network error or other issues
        throw new APIError(
            'Network error: Unable to reach server',
            0,
            { originalError: error }
        );
    }
};

/**
 * Hook to fetch and poll node data
 * Uses SWR for automatic revalidation and caching
 * Polling can be toggled on/off via UI store
 */
/**
 * Calculate delay in milliseconds until next 08:00, 09:00, or 10:00 WIB (UTC+7)
 */
const getNextScheduleDelay = () => {
    // Get current time in WIB (UTC+7)
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utcTime + (7 * 3600000)); // UTC+7

    // Schedules in WIB: 8, 9, 10
    const schedules = [8, 9, 10];
    let nextTarget = null;

    for (const hours of schedules) {
        const target = new Date(wibTime);
        target.setHours(hours, 0, 0, 0);
        if (target.getTime() > wibTime.getTime()) {
            nextTarget = target;
            break;
        }
    }

    // If no time left today (past 10 AM WIB), target 8 AM tomorrow
    if (!nextTarget) {
        nextTarget = new Date(wibTime);
        nextTarget.setDate(nextTarget.getDate() + 1);
        nextTarget.setHours(8, 0, 0, 0);
    }

    // Calculate delay from actual current time (not WIB)
    const delay = Math.max(0, nextTarget.getTime() - wibTime.getTime());
    console.log(`[StatusCheck] Jadwal berikutnya: ${nextTarget.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB (dalam ${Math.round(delay / 60000)} menit)`);
    return delay;
};

/**
 * Hook to fetch and poll node data
 * Uses SWR for automatic revalidation and caching
 * ✅ TAHAP 3: With AbortController for request cancellation
 */
export function useNodeData() {
    const { statusCheckEnabled, statusCheckInterval } = useUIStore();

    const { data, error, isLoading, mutate } = useSWR<{ 
        data: NodeData[]; 
        isConfigError: boolean; 
        message?: string;
    }>(
        "/api/nodes",
        (url) => {
            // Create AbortController for this request
            const controller = new AbortController();
            const promise = fetcher(url, controller.signal);
            
            // Attach abort method to promise for SWR cleanup
            (promise as any).cancel = () => controller.abort();
            
            return promise;
        },
        {
            refreshInterval: () => {
                // Only poll if status check is enabled
                if (!statusCheckEnabled) return 0;
                if (statusCheckInterval === -1) {
                    return getNextScheduleDelay();
                }
                return statusCheckInterval * 1000;
            },
            revalidateOnFocus: statusCheckEnabled ? POLLING_CONFIG.FOCUS_REVALIDATION : false,
            revalidateOnReconnect: statusCheckEnabled,
            dedupingInterval: 2000,
        }
    );

    return {
        nodes: data?.data || [],
        isLoading,
        isError: error,
        isConfigError: data?.isConfigError || false,
        configMessage: data?.message || null,
        mutate,
    };
}

/**
 * Hook to fetch a single node
 * ✅ TAHAP 3: With AbortController support
 */
export function useNode(nodeId: string | null) {
    const shouldFetch = nodeId !== null;

    const simpleFetcher = async (url: string, signal?: AbortSignal) => {
        const res = await fetch(url, { signal });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new APIError(
                errorData.error || `Failed to fetch node: ${res.statusText}`,
                res.status,
                errorData
            );
        }
        
        const json = await res.json();
        return json.data;
    };

    const { data, error, isLoading } = useSWR<NodeData>(
        shouldFetch ? `/api/nodes/${nodeId}` : null,
        (url) => {
            const controller = new AbortController();
            const promise = simpleFetcher(url, controller.signal);
            (promise as any).cancel = () => controller.abort();
            return promise;
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    return {
        node: data,
        isLoading,
        isError: error,
    };
}
