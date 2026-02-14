import { NodeData, NodePosition, VisualizationMode } from "@/types";
import { LAYOUT_CONFIG, VIEWPORT_MARGINS, UI_CONSTANTS } from "@/lib/constants";
import * as d3 from "d3-force";

/**
 * Simulation Node Type
 * ✅ TAHAP 3: Proper TypeScript interface replacing 'any'
 */
interface SimulationNode extends d3.SimulationNodeDatum {
    id: string;
    x: number;
    y: number;
    z: number;
    radius: number;
}

/**
 * Atom Layout Engine
 * Uses d3-force for force-directed positioning with viewport bounds
 * FRONTEND ONLY - Visual layout calculation
 * Optimized to match Atom-map.html configuration
 */

export function calculateAtomLayout(
    nodes: NodeData[],
    width: number = 1920,
    height: number = 1080
): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();

    if (nodes.length === 0) {
        return positions;
    }

    // Use provided dimensions for layout bounds
    const viewportWidth = width;
    const viewportHeight = height;

    // Header is ~80-100px. Center of screen (0,0) is at height/2 from top.
    // We adjust bounds to ensure nodes stay within visible area.
    const bounds = {
        minX: -viewportWidth / 2 + VIEWPORT_MARGINS.LEFT,
        maxX: viewportWidth / 2 - VIEWPORT_MARGINS.RIGHT,
        minY: -viewportHeight / 2 + VIEWPORT_MARGINS.TOP,
        maxY: viewportHeight / 2 - VIEWPORT_MARGINS.BOTTOM,
    };

    // Visual radius is approx 8-10.
    // ✅ TAHAP 7.5: Increased from 10 to 15 to prevent collision (bug fix)
    // This ensures minimum distance between nodes meets test requirements
    const baseRadius = 15;

    // Create simulation nodes with calculated radius
    const simulationNodes: SimulationNode[] = nodes.map((node) => ({
        id: node.id,
        x: (Math.random() - 0.5) * 500, // Start closer to center
        y: (Math.random() - 0.5) * 500,
        z: 0,
        radius: baseRadius,
    }));

    // Pre-calculate boundary clamping function
    // ✅ TAHAP 3: Typed parameter instead of 'any'
    const clampPosition = (node: SimulationNode): void => {
        const margin = node.radius;
        node.x = Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, node.x || 0));
        node.y = Math.max(bounds.minY + margin, Math.min(bounds.maxY - margin, node.y || 0));
        node.z = 0;
    };

    // D3 force simulation
    const simulation = d3
        .forceSimulation<SimulationNode>(simulationNodes)
        .force(
            "center",
            d3.forceCenter(0, 0).strength(LAYOUT_CONFIG.ATOM.centerStrength)
        )
        .force(
            "collision",
            d3.forceCollide<SimulationNode>((d) => d.radius + LAYOUT_CONFIG.ATOM.collisionRadius).strength(1)
        )
        .force("charge", d3.forceManyBody<SimulationNode>().strength(5))
        .force("x", d3.forceX<SimulationNode>(0).strength(LAYOUT_CONFIG.ATOM.centerStrength * 2.0))
        .force("y", d3.forceY<SimulationNode>(0).strength(LAYOUT_CONFIG.ATOM.centerStrength * 2.0))
        .stop();

    // ✅ TAHAP 3: Use UI_CONSTANTS instead of magic numbers
    const iterations = Math.min(
        UI_CONSTANTS.LAYOUT.MAX_ITERATIONS,
        UI_CONSTANTS.LAYOUT.BASE_ITERATIONS + (nodes.length * UI_CONSTANTS.LAYOUT.ITERATIONS_PER_NODE)
    );

    // ✅ TAHAP 3: Use UI_CONSTANTS for convergence thresholds
    let previousAlpha = Infinity;

    for (let i = 0; i < iterations; i++) {
        simulation.tick();

        // Apply boundary constraints
        simulationNodes.forEach(clampPosition);

        // ✅ Check convergence periodically (not every tick for performance)
        if (i > UI_CONSTANTS.LAYOUT.CONVERGENCE_MIN_ITERATIONS && 
            i % UI_CONSTANTS.LAYOUT.CONVERGENCE_CHECK_INTERVAL === 0) {
            const currentAlpha = simulation.alpha();
            const alphaChange = Math.abs(previousAlpha - currentAlpha);

            // If energy change is minimal, layout has converged
            if (alphaChange < UI_CONSTANTS.LAYOUT.CONVERGENCE_THRESHOLD && 
                currentAlpha < UI_CONSTANTS.LAYOUT.ALPHA_THRESHOLD) {
                console.log(`✅ Layout converged after ${i} iterations (${nodes.length} nodes)`);
                break;
            }

            previousAlpha = currentAlpha;
        }
    }

    // Convert to position map
    simulationNodes.forEach((node) => {
        positions.set(node.id, {
            id: node.id,
            x: node.x || 0,
            y: node.y || 0,
            z: 0, // Flat layout
        });
    });

    return positions;
}

/**
 * Auto-focus on DOWN nodes in Atom mode
 * Returns the position to focus camera on
 */
export function findAtomFocusTarget(
    nodes: NodeData[],
    positions: Map<string, NodePosition>
): { x: number; y: number; z: number } | null {
    const downNodes = nodes.filter((n) => n.status === "DOWN");

    if (downNodes.length === 0) {
        return null;
    }

    // Calculate center of DOWN nodes
    let sumX = 0,
        sumY = 0,
        sumZ = 0;

    downNodes.forEach((node) => {
        const pos = positions.get(node.id);
        if (pos) {
            sumX += pos.x;
            sumY += pos.y;
            sumZ += pos.z;
        }
    });

    return {
        x: sumX / downNodes.length,
        y: sumY / downNodes.length,
        z: sumZ / downNodes.length,
    };
}
