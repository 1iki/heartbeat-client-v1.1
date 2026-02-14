import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import NodeModel from "@/lib/db/models/Node";
import { performHealthCheck } from "@/lib/monitoring/healthCheck";

/**
 * Manual Health Check Endpoint
 * POST /api/nodes/[id]/check
 * Trigger immediate health check for a specific node
 */

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();

        const { id } = params;

        // Find the node, include secrets for auth check
        const node = await NodeModel.findById(id).select("+authConfig.username +authConfig.password +authConfig.token +authConfig.headerValue");

        if (!node) {
            return NextResponse.json(
                { success: false, error: "Node not found" },
                { status: 404 }
            );
        }

        console.log(`🔄 Manual health check triggered for: ${node.name} (${node.url})`);

        // Perform health check (without auth for now since authConfig is not in schema)
        const healthResult = await performHealthCheck(
            node.url,
            node.authConfig,
            15000 // 15 second timeout
        );

        // Update node with results
        node.status = healthResult.status;
        node.latency = healthResult.latency;
        node.httpStatus = healthResult.httpStatus;
        node.lastChecked = new Date();
        
        // Add to history using schema method
        (node as any).addLatencyToHistory(healthResult.latency);
        
        if (healthResult.error) {
            node.statusMessage = healthResult.error;
        } else {
            // Clear error if healthy
            node.statusMessage = undefined;
        }

        await node.save();

        console.log(`✅ Health check completed: ${node.name} - Status: ${healthResult.status}`);
        if (healthResult.error) {
            console.log(`⚠️ Error details: ${healthResult.error}`);
        }

        return NextResponse.json({
            success: true,
            data: {
                nodeId: node._id,
                name: node.name,
                url: node.url,
                status: healthResult.status,
                latency: healthResult.latency,
                lastChecked: node.lastChecked,
                error: healthResult.error // Include error in response for frontend
            }
        });

    } catch (error: any) {
        console.error("Manual health check error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Health check failed" },
            { status: 500 }
        );
    }
}
