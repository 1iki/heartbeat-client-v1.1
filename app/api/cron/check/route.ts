import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import NodeModel from "@/lib/db/models/Node";
import { performHealthCheck, shouldTriggerAlert } from "@/lib/monitoring/healthCheck";

/**
 * POST /api/cron/check
 * Scheduled health check endpoint
 * Triggered by Vercel Cron or manual invocation
 * 
 * BACKEND ONLY - Performs health checks and updates node status
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized",
                },
                { status: 401 }
            );
        }

        await connectDB();

        // Fetch all nodes
        const nodes = await NodeModel.find({});

        if (nodes.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No nodes to check",
                checked: 0,
            });
        }

        const results = {
            checked: 0,
            updated: 0,
            errors: 0,
            alerts: [] as { nodeId: string; name: string; oldStatus: string; newStatus: string }[],
        };

        // Perform health checks for all nodes
        for (const node of nodes) {
            try {
                // Perform health check with auth config if available
                const healthResult = await performHealthCheck(
                    node.url,
                    node.authConfig, // Pass auth config if exists
                    15000 // 15 second timeout
                );

                const oldStatus = node.status;
                const newStatus = healthResult.status;

                // Update node
                node.status = newStatus;
                node.latency = healthResult.latency;
                node.httpStatus = healthResult.httpStatus;
                node.lastChecked = new Date();
                
                // Add to history using schema method (maintains max 20)
                (node as any).addLatencyToHistory(healthResult.latency);
                
                // Update status message
                if (healthResult.error) {
                    node.statusMessage = healthResult.error;
                } else {
                    node.statusMessage = undefined;
                }

                await node.save();

                results.checked++;
                results.updated++;

                // Check if alert should be triggered
                if (shouldTriggerAlert(oldStatus, newStatus)) {
                    results.alerts.push({
                        nodeId: node._id.toString(),
                        name: node.name,
                        oldStatus,
                        newStatus,
                    });
                }
            } catch (error: any) {
                console.error(`Error checking node ${node.name}:`, error);
                results.errors++;
            }
        }

        return NextResponse.json({
            success: true,
            message: "Health check completed",
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Error in health check cron:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Health check failed",
                message: error.message,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/cron/check
 * Manual trigger for health check (for testing)
 */
export async function GET(request: NextRequest) {
    // Call the POST handler
    return POST(request);
}
