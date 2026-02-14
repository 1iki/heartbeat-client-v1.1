import { NodeStatus, AuthConfig } from "@/types";
import { performPlaywrightHealthCheck } from "./playwrightHealthCheck";
import { logger } from "@/lib/utils/logger";

/**
 * Health Check Utility
 * BACKEND ONLY - Performs health checks on monitored URLs
 * Supports both simple HTTP checks and authenticated browser-based checks
 */

export interface HealthCheckResult {
    status: NodeStatus;
    latency: number;
    httpStatus?: number;
    error?: string;
}

/**
 * Perform health check on a URL
 * Routes to appropriate check method based on auth requirement
 */
export async function performHealthCheck(
    url: string,
    authConfig?: AuthConfig,
    timeoutMs: number = 10000
): Promise<HealthCheckResult> {
    // If URL requires auth, use Playwright-based check
    if (authConfig && authConfig.type === "BROWSER_LOGIN") {
        logger.info('Using Playwright health check for authenticated URL', {
            url,
            authType: authConfig.type
        });
        // Use a longer timeout for browser checks (minimum 60s to allow for 30s stabilization)
        return await performPlaywrightHealthCheck(url, authConfig, Math.max(timeoutMs, 60000));
    }

    // Otherwise use simple HTTP check
    return await performSimpleHealthCheck(url, timeoutMs);
}

/**
 * Simple HTTP-based health check (existing logic)
 * For public URLs that don't require authentication
 */
async function performSimpleHealthCheck(
    url: string,
    timeoutMs: number = 10000
): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Try HEAD request first (lighter)
        let response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            headers: {
                "User-Agent": "Visual-Monitoring-Platform/1.0",
            },
        }).catch(async (headError) => {
            // If HEAD fails, fallback to GET (some servers don't support HEAD)
            logger.debug('HEAD request failed, trying GET', { url, error: headError.message });
            return await fetch(url, {
                method: "GET",
                signal: controller.signal,
                headers: {
                    "User-Agent": "Visual-Monitoring-Platform/1.0",
                },
            });
        });

        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        const httpStatus = response.status;

        // Determine node status based on response
        let status: NodeStatus;

        if (httpStatus >= 500) {
            // 5xx errors = DOWN
            status = "DOWN";
        } else if (httpStatus >= 400) {
            // 4xx errors = WARNING
            status = "WARNING";
        } else if (latency > 5000) {
            // > 5s latency = WARNING (too slow)
            status = "WARNING";
        } else if (latency > 500) {
            // 500ms-5s = STABLE but slower
            status = "STABLE";
        } else {
            // < 500ms = STABLE (optimal)
            status = "STABLE";
        }

        return {
            status,
            latency,
            httpStatus,
        };
    } catch (error: any) {
        const latency = Date.now() - startTime;

        // Handle different error types
        if (error.name === "AbortError") {
            // Timeout
            return {
                status: "DOWN",
                latency: timeoutMs,
                error: "Request timeout",
            };
        }

        // Network error or other failure
        return {
            status: "DOWN",
            latency,
            error: error.message || "Health check failed",
        };
    }
}

/**
 * Determine if status change should trigger alert
 */
export function shouldTriggerAlert(
    oldStatus: NodeStatus,
    newStatus: NodeStatus
): boolean {
    // Trigger alert if status changes to/from DOWN or WARNING
    if (oldStatus === "DOWN" || newStatus === "DOWN") {
        return oldStatus !== newStatus;
    }

    if (oldStatus === "WARNING" || newStatus === "WARNING") {
        return oldStatus !== newStatus;
    }

    // STABLE <-> FRESH transitions don't trigger alerts
    return false;
}

/**
 * Determine appropriate status for a new node
 * First check gets FRESH status
 */
export function getInitialStatus(healthResult: HealthCheckResult): NodeStatus {
    if (healthResult.status === "DOWN") {
        return "DOWN";
    }
    // First successful check = FRESH
    return "FRESH";
}
