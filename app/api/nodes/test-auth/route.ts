import { NextRequest, NextResponse } from "next/server";
import { performPlaywrightHealthCheck } from "@/lib/monitoring/playwrightHealthCheck";
import { AuthConfig } from "@/types";

/**
 * Test Auth Endpoint
 * Test authentication configuration before saving
 * POST /api/nodes/test-auth
 */

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, authConfig } = body as { url: string; authConfig: AuthConfig };

        if (!url) {
            return NextResponse.json(
                { success: false, error: "URL is required" },
                { status: 400 }
            );
        }

        if (!authConfig || authConfig.type === "NONE") {
            return NextResponse.json(
                { success: false, error: "Auth configuration is required" },
                { status: 400 }
            );
        }

        if (!authConfig.username || !authConfig.password) {
            return NextResponse.json(
                { success: false, error: "Username and password are required" },
                { status: 400 }
            );
        }

        console.log(`🧪 Testing authentication for ${url}...`);

        // Perform test login
        const startTime = Date.now();
        const result = await performPlaywrightHealthCheck(url, authConfig, 30000);
        const duration = Date.now() - startTime;

        if (result.status === "DOWN" && result.error?.includes("Authentication")) {
            return NextResponse.json({
                success: false,
                error: result.error,
                duration,
                message: "Authentication test failed. Please check your credentials and selectors."
            });
        }

        if (result.status === "DOWN") {
            return NextResponse.json({
                success: false,
                error: result.error || "Health check failed",
                duration,
                message: "Login succeeded but health check failed."
            });
        }

        return NextResponse.json({
            success: true,
            status: result.status,
            latency: result.latency,
            duration,
            message: "Authentication test successful! ✅"
        });

    } catch (error: any) {
        console.error("Test auth error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Test failed",
                message: "An error occurred during authentication test"
            },
            { status: 500 }
        );
    }
}
