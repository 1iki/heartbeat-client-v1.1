import mongoose, { Schema, Model, Types } from "mongoose";
import { INode, NodeStatus, NodeGroup } from "@/types";

/**
 * Node Schema Definition
 * Represents a monitored service/URL in the system
 * 
 * BACKEND ONLY - This schema is visual-agnostic
 */

// Interface for static methods
interface INodeModel extends Model<INode> {
    validateDependencies(
        nodeId: Types.ObjectId,
        dependencies: Types.ObjectId[]
    ): Promise<boolean>;
}

const NodeSchema = new Schema<INode>(
    {
        name: {
            type: String,
            required: [true, "Node name is required"],
            trim: true,
            unique: true,
            index: true,
        },
        url: {
            type: String,
            required: [true, "URL is required"],
            trim: true,
            validate: {
                validator: function (v: string) {
                    // Basic URL validation
                    try {
                        new URL(v);
                        return true;
                    } catch {
                        return false;
                    }
                },
                message: (props) => `${props.value} is not a valid URL`,
            },
        },
        group: {
            type: String,
            required: [true, "Group is required"],
            enum: ["iframe", "video", "game", "webgl", "website", "backend", "frontend", "api", "database", "service"],
            default: "website",
        },
        dependencies: [
            {
                type: Schema.Types.ObjectId,
                ref: "Node",
            },
        ],
        authConfig: {
            type: {
                type: String,
                enum: ["NONE", "BASIC", "BEARER", "API_KEY", "BROWSER_LOGIN"],
                default: "NONE",
            },
            username: { type: String, select: false },
            password: { type: String, select: false },
            token: { type: String, select: false },
            headerName: { type: String },
            headerValue: { type: String, select: false },
            // Browser Login Fields
            loginUrl: { type: String },
            loginType: {
                type: String,
                enum: ["page", "modal"],
                default: "page"
            },
            modalTriggerSelector: { type: String },
            usernameSelector: { type: String },
            passwordSelector: { type: String },
            submitSelector: { type: String },
            loginSuccessSelector: { type: String },
        },
        status: {
            type: String,
            enum: ["STABLE", "FRESH", "WARNING", "DOWN"],
            default: "FRESH",
            index: true,
        },
        latency: {
            type: Number,
            default: 0,
            min: 0,
        },
        history: {
            type: [Number],
            default: [],
            validate: {
                validator: function (v: number[]) {
                    // Keep only last 20 measurements
                    return v.length <= 20;
                },
                message: "History array should not exceed 20 entries",
            },
        },
        lastChecked: {
            type: Date,
            default: Date.now,
            index: true,
        },
        httpStatus: {
            type: Number,
        },
        statusMessage: {
            type: String,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
        collection: "nodes",
    }
);

// Indexes for query performance
NodeSchema.index({ status: 1, lastChecked: -1 });
NodeSchema.index({ group: 1 });

// Virtual for populated dependencies (for frontend response)
NodeSchema.virtual("dependencyNodes", {
    ref: "Node",
    localField: "dependencies",
    foreignField: "_id",
});

// Method to add latency to history (maintains last 20)
NodeSchema.methods.addLatencyToHistory = function (newLatency: number) {
    this.history.push(newLatency);

    // Keep only last 20 measurements
    if (this.history.length > 20) {
        this.history = this.history.slice(-20);
    }

    // CRITICAL: Mark array as modified so Mongoose saves changes
    this.markModified('history');

    return this.history;
};

// Static method to validate no circular dependencies
NodeSchema.statics.validateDependencies = async function (
    nodeId: Types.ObjectId,
    dependencies: Types.ObjectId[]
): Promise<boolean> {
    // Check if any dependency eventually points back to this node
    const globalVisited = new Set<string>(); // Global visited set for entire validation
    
    const checkCircular = async (
        currentId: Types.ObjectId
    ): Promise<boolean> => {
        const idStr = currentId.toString();

        // If we've visited this node in current path, it's a cycle
        if (globalVisited.has(idStr)) {
            return true; // Found a cycle
        }

        // If dependency points back to original node, it's circular
        if (nodeId && idStr === nodeId.toString()) {
            return true;
        }

        // Mark as visited
        globalVisited.add(idStr);

        const node = await this.findById(currentId).select("dependencies");
        if (!node || !node.dependencies.length) {
            return false; // No more dependencies to check
        }

        // Check all dependencies recursively
        for (const dep of node.dependencies) {
            if (await checkCircular(dep)) {
                return true; // Circular dependency found
            }
        }

        return false;
    };

    // Check each dependency
    for (const dep of dependencies) {
        globalVisited.clear(); // Reset for each top-level dependency check
        if (await checkCircular(dep)) {
            return false; // Invalid: circular dependency found
        }
    }

    return true; // Valid: no circular dependencies
};

// Create and export model
const NodeModel =
    (mongoose.models.Node as unknown as INodeModel) || mongoose.model<INode, INodeModel>("Node", NodeSchema);

export default NodeModel;
