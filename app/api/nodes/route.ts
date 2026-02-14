import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import NodeModel from "@/lib/db/models/Node";
import { NodeData } from "@/types";
import { validateNodeData, normalizeURL, sanitizeString } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logger";
import { handleAPIError, successResponse, databaseError, validationError, conflictError } from "@/lib/utils/api-helpers";

/**
 * GET /api/nodes
 * Fetch all monitored nodes
 * Returns visual-agnostic data for frontend consumption
 */

// ✅ FIX: Use Map with Promise for atomic tracking (prevents race conditions)
const activeHealthChecks = new Map<string, Promise<void>>();

/**
 * Performs health check internal logic with retry on version conflicts
 */
async function performHealthCheckInternal(node: any): Promise<void> {
    const { performHealthCheck } = await import("@/lib/monitoring/healthCheck");
    const NodeModel = (await import("@/lib/db/models/Node")).default;

    // Perform health check
    const result = await performHealthCheck(node.url, node.authConfig);

    // Retry logic for version conflicts (optimistic locking)
    const MAX_RETRIES = 3;
    
    for (let retries = 0; retries < MAX_RETRIES; retries++) {
        try {
            // Always fetch fresh document to get latest version
            const nodeDoc = await NodeModel.findById(node._id);
            if (!nodeDoc) {
                logger.warn('Node no longer exists', { nodeId: node._id, nodeName: node.name });
                return;
            }
            
            nodeDoc.status = result.status;
            nodeDoc.latency = result.latency;
            nodeDoc.httpStatus = result.httpStatus;
            nodeDoc.statusMessage = result.error;
            nodeDoc.lastChecked = new Date();
            (nodeDoc as any).addLatencyToHistory(result.latency);
            
            await nodeDoc.save();
            return; // Success - exit
            
        } catch (saveErr: any) {
            // Handle version conflict with exponential backoff
            if (saveErr.name === 'VersionError' && retries < MAX_RETRIES - 1) {
                logger.debug('Version conflict retry', {
                    nodeId: node._id,
                    nodeName: node.name,
                    retry: retries + 1,
                    maxRetries: MAX_RETRIES
                });
                // Exponential backoff: 100ms, 200ms, 400ms
                await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
                continue;
            }
            throw saveErr;
        }
    }
}

/**
 * ✅ FIXED: Trigger background check with atomic Promise-based tracking
 * Prevents race conditions and provides proper timeout handling
 */
async function triggerBackgroundCheck(node: any): Promise<void> {
    const nodeId = node._id.toString();
    
    // ✅ Atomic check: If already running, return existing promise
    const existingCheck = activeHealthChecks.get(nodeId);
    if (existingCheck) {
        return existingCheck;
    }
    
    // ✅ Create promise before async work (atomic set)
    const checkPromise = (async () => {
        // Create timeout promise (60 seconds)
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 60000)
        );
        
        const healthCheckPromise = performHealthCheckInternal(node);
        
        try {
            // ✅ Race between health check and timeout
            await Promise.race([healthCheckPromise, timeoutPromise]);
        } catch (error: any) {
            if (error.message === 'Health check timeout') {
                logger.warn('Health check timeout', {
                    nodeId: node._id,
                    nodeName: node.name,
                    url: node.url
                });
            } else {
                logger.error('Background check failed', error, {
                    nodeId: node._id,
                    nodeName: node.name,
                    url: node.url
                });
            }
        } finally {
            // ✅ Always cleanup from map
            activeHealthChecks.delete(nodeId);
        }
    })();
    
    // ✅ Atomic set - register promise immediately
    activeHealthChecks.set(nodeId, checkPromise);
    
    return checkPromise;
}

/**
 * GET /api/nodes
 * Fetch all monitored nodes
 * Returns visual-agnostic data for frontend consumption
 * ALSO triggers background health checks for stale nodes
 * 
 * NOTE: Prevents duplicate concurrent checks using tracking Set
 * and implements retry logic for version conflicts
 */
export async function GET(request: NextRequest) {
    try {
        // Check if MongoDB is configured
        if (!process.env.MONGODB_URI) {
            return NextResponse.json({
                success: true,
                data: [],
                count: 0,
                message: "MongoDB not configured. Please set MONGODB_URI in .env.local",
            });
        }

        await connectDB();

        // Fetch all nodes, sorted by status (DOWN first) and name
        // Include authConfig to pass to healthCheck
        const nodes = await NodeModel.find({})
            .select("+authConfig.username +authConfig.password +authConfig.token +authConfig.headerName +authConfig.headerValue +authConfig.loginSuccessSelector")
            .sort({ status: -1, name: 1 })
            .lean();

        // Check for stale nodes (not checked in last 30 seconds)
        // This prevents triggering background checks too frequently
        const now = Date.now();
        const STALE_THRESHOLD = 30000; // 30 seconds (balanced with typical polling intervals)

        nodes.forEach((node) => {
            const lastChecked = node.lastChecked ? new Date(node.lastChecked).getTime() : 0;
            // Only trigger background check if node is truly stale (>2min old)
            if (now - lastChecked > STALE_THRESHOLD) {
                // Fire and forget - don't await
                triggerBackgroundCheck(node);
            }
        });

        // Transform to frontend format (string IDs instead of ObjectId)
        const nodesData: NodeData[] = nodes.map((node) => ({
            id: node._id.toString(),
            name: node.name,
            url: node.url,
            group: node.group,
            dependencies: node.dependencies.map((dep) => dep.toString()),
            status: node.status,
            latency: node.latency,
            history: node.history,
            lastChecked: node.lastChecked.toISOString(),
            httpStatus: node.httpStatus, // Include HTTP status for error display
            statusMessage: node.statusMessage, // Include error message for tooltip
            // Don't leak secrets
            authConfig: node.authConfig ? {
                type: node.authConfig.type,
                username: node.authConfig.username,
                headerName: node.authConfig.headerName
            } : undefined
        }));

        logger.info('Fetched nodes successfully', { count: nodesData.length });
        return successResponse(nodesData);
    } catch (error: any) {
        // Check if it's a database connection error
        if (error.message?.includes('MongoDB') || error.message?.includes('connection')) {
            return databaseError();
        }
        return handleAPIError(error, { endpoint: 'GET /api/nodes' });
    }
}

/**
 * POST /api/nodes
 * Create a new monitored node
 * ✅ TAHAP 2: Enhanced with strict input validation
 */
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { name, url, group, dependencies = [], authConfig } = body;

        // ✅ TAHAP 2: Comprehensive validation using validation utilities
        const validation = validateNodeData({
            name,
            url,
            group,
            dependencies
        });

        if (!validation.valid) {
            return validationError(validation.error || 'Validation failed');
        }

        // Sanitize inputs
        const sanitizedName = sanitizeString(name);
        const trimmedUrl = url.trim();

        // Check if name already exists
        const existing = await NodeModel.findOne({ name: sanitizedName });
        if (existing) {
            return conflictError('Node with this name already exists', {
                name: sanitizedName,
                existingNodeId: existing._id
            });
        }
        
        // ✅ TAHAP 2: Check if URL already exists using normalizeURL utility
        const normalizedUrl = normalizeURL(trimmedUrl);
        
        const allNodes = await NodeModel.find({}).select('url').lean();
        const urlExists = allNodes.some(node => normalizeURL(node.url) === normalizedUrl);
        
        if (urlExists) {
            return conflictError('Node with this URL already exists', {
                url: trimmedUrl,
                normalizedUrl
            });
        }

        // Validate dependencies (check for circular references)
        if (dependencies.length > 0) {
            const isValid = await NodeModel.validateDependencies(
                null as any, // New node, no ID yet
                dependencies
            );

            if (!isValid) {
                return validationError('Invalid dependencies: circular reference detected', 'dependencies');
            }
        }

        // ✅ TAHAP 2: Create new node with sanitized and validated data
        const newNode = await NodeModel.create({
            name: sanitizedName,
            url: trimmedUrl,
            group: group || "website",
            dependencies,
            authConfig,
            status: "FRESH",
            latency: 0,
            history: [],
            lastChecked: new Date(),
        });

        // Transform to frontend format
        const nodeData: NodeData = {
            id: newNode._id.toString(),
            name: newNode.name,
            url: newNode.url,
            group: newNode.group,
            dependencies: newNode.dependencies.map((dep) => dep.toString()),
            status: newNode.status,
            latency: newNode.latency,
            history: newNode.history,
            lastChecked: newNode.lastChecked.toISOString(),
        };

        logger.info('Node created successfully', {
            nodeId: nodeData.id,
            nodeName: nodeData.name,
            url: nodeData.url
        });

        return successResponse(nodeData, 'Node created successfully', 201);
    } catch (error: any) {
        return handleAPIError(error, {
            endpoint: 'POST /api/nodes'
        });
    }
}
