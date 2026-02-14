import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import NodeModel from "@/lib/db/models/Node";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nodeIds, authConfig } = body;

        if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
            return NextResponse.json({ success: false, error: "No nodes selected" }, { status: 400 });
        }

        if (!authConfig || !authConfig.type) {
            return NextResponse.json({ success: false, error: "Missing or invalid auth config" }, { status: 400 });
        }

        await connectDB();

        // Clean up authConfig - remove empty fields to avoid overwriting with blanks
        const cleanConfig: any = { type: authConfig.type };
        if (authConfig.loginType) cleanConfig.loginType = authConfig.loginType;
        
        // Only include non-empty credential fields
        if (authConfig.username) cleanConfig.username = authConfig.username;
        if (authConfig.password) cleanConfig.password = authConfig.password;
        if (authConfig.token) cleanConfig.token = authConfig.token;
        if (authConfig.headerName) cleanConfig.headerName = authConfig.headerName;
        if (authConfig.headerValue) cleanConfig.headerValue = authConfig.headerValue;
        if (authConfig.loginUrl) cleanConfig.loginUrl = authConfig.loginUrl;
        if (authConfig.modalTriggerSelector) cleanConfig.modalTriggerSelector = authConfig.modalTriggerSelector;
        if (authConfig.usernameSelector) cleanConfig.usernameSelector = authConfig.usernameSelector;
        if (authConfig.passwordSelector) cleanConfig.passwordSelector = authConfig.passwordSelector;
        if (authConfig.submitSelector) cleanConfig.submitSelector = authConfig.submitSelector;
        if (authConfig.loginSuccessSelector) cleanConfig.loginSuccessSelector = authConfig.loginSuccessSelector;

        console.log(`[Bulk Auth] Updating ${nodeIds.length} nodes with auth type: ${cleanConfig.type}`);

        // Perform bulk update
        const result = await NodeModel.updateMany(
            { _id: { $in: nodeIds } },
            { $set: { authConfig: cleanConfig } }
        );

        console.log(`[Bulk Auth] Result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

        return NextResponse.json({
            success: true,
            data: {
                matched: result.matchedCount,
                modified: result.modifiedCount
            },
            message: `Successfully updated ${result.modifiedCount} of ${result.matchedCount} nodes`
        });

    } catch (err: any) {
        console.error("[Bulk Auth] Error:", err);
        return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
    }
}
