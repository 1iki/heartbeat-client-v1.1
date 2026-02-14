"use client";

import React from "react";
import { EdgeData } from "@/types";
import * as THREE from "three";
import { Line } from "@react-three/drei";

/**
 * Edge Renderer Component
 * Renders connections between nodes for Tree and Neuron modes
 * FRONTEND ONLY
 */

interface EdgeRendererProps {
    edges: EdgeData[];
    mode: "tree" | "neuron" | "none";
}

export function EdgeRenderer({ edges, mode }: EdgeRendererProps) {
    if (mode === "none" || edges.length === 0) {
        return null;
    }

    return (
        <group>
            {edges.map((edge, index) => (
                <EdgeLine key={`${edge.source}-${edge.target}-${index}`} edge={edge} mode={mode} />
            ))}
        </group>
    );
}

interface EdgeLineProps {
    edge: EdgeData;
    mode: "tree" | "neuron";
}

function EdgeLine({ edge, mode }: EdgeLineProps) {
    // If edge has bezier path (from Tree layout), use it
    if (edge.path && edge.path.length > 0) {
        const points = edge.path.map((p) => new THREE.Vector3(p.x, p.y, p.z));

        return (
            <Line
                points={points}
                color={mode === "neuron" ? "#00ffaa" : "#666666"}
                lineWidth={mode === "neuron" ? 2 : 1}
                transparent
                opacity={mode === "neuron" ? 0.6 : 0.3}
            />
        );
    }

    // Straight line (will be calculated from positions in parent)
    return null;
}
