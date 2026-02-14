import { ObjectId } from "mongoose";

/**
 * Node Status Types
 * Backend-determined status based on health checks
 */
export type NodeStatus = "STABLE" | "FRESH" | "WARNING" | "DOWN";

/**
 * Visualization Mode Types
 * Frontend visualization layout modes
 */
export type VisualizationMode = "Atom" | "vector" | "alerts";

/**
 * Node Group Types
 * Categorization for monitored services
 */
export type NodeGroup =
    | "iframe"
    | "video"
    | "game"
    | "webgl"
    | "website"
    | "backend"
    | "frontend"
    | "api"
    | "database"
    | "service";

/**
 * Core Node Interface
 * Represents a monitored service/URL
 * This is the BACKEND data structure (visual-agnostic)
 */
/**
 * Auth Configuration
 */
export interface AuthConfig {
    type: "NONE" | "BASIC" | "BEARER" | "API_KEY" | "BROWSER_LOGIN";
    username?: string;
    password?: string;
    token?: string;
    headerName?: string;
    headerValue?: string;
    // Browser Login fields
    loginUrl?: string;
    loginType?: "page" | "modal";
    modalTriggerSelector?: string;
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    loginSuccessSelector?: string;
}

export interface INode {
    _id: ObjectId;
    name: string;
    url: string;
    group: NodeGroup;
    dependencies: ObjectId[];  // Array for many-to-many relationships (Neuron mode)
    authConfig?: AuthConfig;
    status: NodeStatus;
    latency: number;          // in milliseconds
    history: number[];        // Last 20 latency measurements
    lastChecked: Date;
    createdAt: Date;
    updatedAt: Date;
    httpStatus?: number;
    statusMessage?: string;
}

/**
 * Frontend Node Data
 * Simplified structure for frontend consumption
 */
export interface NodeData {
    id: string;
    name: string;
    url: string;
    group: NodeGroup;
    dependencies: string[];
    authConfig?: AuthConfig;
    status: NodeStatus;
    latency: number;
    history: number[];
    lastChecked: string;
    // Additional fields for detailed view
    responseTime?: number;
    httpStatus?: number;
    statusMessage?: string;
    description?: string;
    requiresAuth?: boolean;
}

/**
 * Node Position (for visualization)
 * Calculated by layout engines (d3-force, dagre)
 */
export interface NodePosition {
    id: string;
    x: number;
    y: number;
    z: number;
}

/**
 * Edge Connection (for Tree and Neuron modes)
 */
export interface EdgeData {
    source: string;
    target: string;
    path?: { x: number; y: number; z: number }[];  // Bezier curve points
}

/**
 * Health Check Result
 * Backend-only structure
 */
export interface HealthCheckResult {
    nodeId: ObjectId;
    status: NodeStatus;
    latency: number;
    timestamp: Date;
    error?: string;
}

/**
 * Visual Mapping Configuration
 * Frontend-only structure for status visualization
 */
export interface StatusVisualConfig {
    color: string;
    animation: "breathing" | "pulse" | "jitter" | "disperse";
    intensity: number;
}
