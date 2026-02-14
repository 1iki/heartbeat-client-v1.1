import { create } from "zustand";
import { NodePosition, EdgeData } from "@/types";

/**
 * Visualization State Store
 * Manages 3D scene state and node positions
 */

interface VisualizationState {
    // Node positions (calculated by layout engines)
    nodePositions: Map<string, NodePosition>;
    setNodePositions: (positions: Map<string, NodePosition>) => void;

    // Edges (for Tree and Neuron modes)
    edges: EdgeData[];
    setEdges: (edges: EdgeData[]) => void;

    // Animation state
    isAnimating: boolean;
    setAnimating: (animating: boolean) => void;

    // Camera auto-focus
    focusNodeId: string | null;
    setFocusNode: (nodeId: string | null) => void;

    // Performance metrics
    fps: number;
    setFps: (fps: number) => void;

    particleCount: number;
    setParticleCount: (count: number) => void;
}

export const useVisualizationStore = create<VisualizationState>((set) => ({
    // Initial state
    nodePositions: new Map(),
    edges: [],
    isAnimating: false,
    focusNodeId: null,
    fps: 60,
    particleCount: 0,

    // Actions
    setNodePositions: (positions) => set({ nodePositions: positions }),

    setEdges: (edges) => set({ edges }),

    setAnimating: (animating) => set({ isAnimating: animating }),

    setFocusNode: (nodeId) => set({ focusNodeId: nodeId }),

    setFps: (fps) => set({ fps }),

    setParticleCount: (count) => set({ particleCount: count }),
}));
