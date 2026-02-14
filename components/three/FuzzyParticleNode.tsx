"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { NodeStatus } from "@/types";
import {
    STATUS_COLORS,
    PARTICLE_CONFIG,
    PARTICLE_DISTRIBUTION,
    ANIMATION_CONFIG,
    UI_CONSTANTS,
} from "@/lib/constants";
import { Text } from "@react-three/drei";

/**
 * Fuzzy Particle Node Component
 * Renders a circle with fuzzy edges made of individual random particles
 * FRONTEND ONLY - Pure visualization
 * NOW WITH CLICKABLE HOVER SPHERE & URL LABEL
 */

interface FuzzyParticleNodeProps {
    nodeId: string;
    nodeName: string;
    nodeUrl: string;
    position: [number, number, number];
    status: NodeStatus;
    size?: number;
    particleCount?: number;
    httpStatus?: number | string;
    statusMessage?: string;
    onHover?: (nodeId: string, nodeName: string, status: NodeStatus, event: ThreeEvent<PointerEvent>, extraData?: any) => void;
    onUnhover?: () => void;
    onClick?: (nodeId: string) => void;
}

export function FuzzyParticleNode({
    nodeId,
    nodeName,
    nodeUrl,
    position,
    status,
    size = 2.0,
    particleCount = PARTICLE_CONFIG.DESKTOP.DEFAULT,
    httpStatus,
    statusMessage,
    onHover,
    onUnhover,
    onClick,
}: FuzzyParticleNodeProps) {
    const pointsRef = useRef<THREE.Points>(null);
    const hoverSphereRef = useRef<THREE.Mesh>(null);
    const timeRef = useRef(0);
    const frameCountRef = useRef(0); // For throttling updates
    const [isHovered, setIsHovered] = useState(false);

    // Detect mobile for LOD
    const isMobile =
        typeof window !== "undefined" && window.innerWidth < 768;

    const actualParticleCount = isMobile
        ? Math.min(particleCount, PARTICLE_CONFIG.MOBILE.MAX)
        : particleCount;

    // Dynamic size multiplier based on status - WARNING and DOWN are larger
    const statusSizeMultiplier = useMemo(() => {
        switch (status) {
            case "DOWN":
                return 1.5;  // 50% larger for critical attention
            case "WARNING":
                return 1.3;  // 30% larger for warning attention
            case "FRESH":
                return 1.0;  // Normal size
            case "STABLE":
                return 1.0;  // Normal size
            default:
                return 1.0;
        }
    }, [status]);

    const effectiveSize = size * statusSizeMultiplier;

    // ✅ TAHAP 3: Use constant instead of magic number
    const hoverSphereRadius = effectiveSize * UI_CONSTANTS.NODE.HOVER_SIZE_MULTIPLIER;

    // Create particle geometry with fuzzy distribution
    const { geometry, initialPositions } = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions: number[] = [];
        const initialPos: number[] = [];

        const { BASE_RADIUS, FUZZY_SCOPE, POWER_CURVE } = PARTICLE_DISTRIBUTION;

        for (let i = 0; i < actualParticleCount; i++) {
            // Random direction (-1 to 1)
            const direction = Math.random() * 2 - 1;

            // Cubic distribution for fuzzy edge
            const radius = BASE_RADIUS + direction * Math.pow(Math.random(), POWER_CURVE) * FUZZY_SCOPE;

            // Random angle
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 2;

            // Spherical to Cartesian (scaled by effectiveSize)
            const x = radius * Math.sin(phi) * Math.cos(theta) * effectiveSize;
            const y = radius * Math.sin(phi) * Math.sin(theta) * effectiveSize;
            const z = radius * Math.cos(phi) * effectiveSize;

            positions.push(x, y, z);
            initialPos.push(x, y, z);
        }

        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

        return { geometry: geo, initialPositions: initialPos };
    }, [actualParticleCount, effectiveSize]);

    // Material with status color
    const material = useMemo(() => {
        return new THREE.PointsMaterial({
            color: STATUS_COLORS[status],
            size: isMobile ? 0.3 : 0.5,  // Increased from 0.2/0.35 - much larger particles
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
        });
    }, [status, isMobile]);

    // Update material color when status changes
    useEffect(() => {
        if (pointsRef.current) {
            (pointsRef.current.material as THREE.PointsMaterial).color.set(
                STATUS_COLORS[status]
            );
        }
    }, [status]);

    // Handle hover
    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
        if (onHover) {
            onHover(nodeId, nodeName, status, e, { httpStatus, statusMessage });
        }
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsHovered(false);
        document.body.style.cursor = 'default';
        if (onUnhover) {
            onUnhover();
        }
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (onClick) {
            onClick(nodeId);
        }
    };

    // Animation based on status
    useFrame((_state, delta) => {
        if (!pointsRef.current) return;

        timeRef.current += delta;
        const positions = geometry.attributes.position.array as Float32Array;

        switch (status) {
            case "STABLE":
                // Breathing animation (opacity oscillation)
                {
                    const { opacityRange } = ANIMATION_CONFIG.BREATHING;
                    const breathe =
                        opacityRange[0] +
                        (opacityRange[1] - opacityRange[0]) *
                        (Math.sin(timeRef.current / ANIMATION_CONFIG.BREATHING.duration) * 0.5 + 0.5);

                    (pointsRef.current.material as THREE.PointsMaterial).opacity = breathe;
                }
                break;

            case "FRESH":
                // Expanding pulse
                {
                    const pulse =
                        1 +
                        0.2 *
                        Math.sin(timeRef.current / ANIMATION_CONFIG.PULSE.duration * Math.PI * 2);

                    for (let i = 0; i < positions.length; i += 3) {
                        const idx = i / 3;
                        positions[i] = initialPositions[idx * 3] * pulse;
                        positions[i + 1] = initialPositions[idx * 3 + 1] * pulse;
                        positions[i + 2] = initialPositions[idx * 3 + 2] * pulse;
                    }

                    geometry.attributes.position.needsUpdate = true;
                }
                break;

            case "WARNING":
                // High-frequency jitter (throttled to every 2nd frame for performance)
                {
                    frameCountRef.current++;
                    if (frameCountRef.current % 2 === 0) {
                        const { displacement } = ANIMATION_CONFIG.JITTER;

                        for (let i = 0; i < positions.length; i += 3) {
                            const idx = i / 3;
                            const jitterX = (Math.random() - 0.5) * displacement * 0.1;
                            const jitterY = (Math.random() - 0.5) * displacement * 0.1;
                            const jitterZ = (Math.random() - 0.5) * displacement * 0.1;

                            positions[i] = initialPositions[idx * 3] + jitterX;
                            positions[i + 1] = initialPositions[idx * 3 + 1] + jitterY;
                            positions[i + 2] = initialPositions[idx * 3 + 2] + jitterZ;
                        }

                        geometry.attributes.position.needsUpdate = true;
                    }
                }
                break;

            case "DOWN":
                // Pulse & disperse (throttled to every 3rd frame for performance)
                {
                    frameCountRef.current++;
                    if (frameCountRef.current % 3 === 0) {
                        const { spreadRadius } = ANIMATION_CONFIG.DISPERSE;
                        const disperse =
                            1 +
                            spreadRadius *
                            Math.sin(timeRef.current / ANIMATION_CONFIG.DISPERSE.duration * Math.PI);

                        for (let i = 0; i < positions.length; i += 3) {
                            const idx = i / 3;
                            positions[i] = initialPositions[idx * 3] * disperse;
                            positions[i + 1] = initialPositions[idx * 3 + 1] * disperse;
                            positions[i + 2] = initialPositions[idx * 3 + 2] * disperse;
                        }

                        geometry.attributes.position.needsUpdate = true;
                    }

                    // Strong pulse on opacity (this is cheap, no throttle needed)
                    (pointsRef.current.material as THREE.PointsMaterial).opacity =
                        0.6 + 0.4 * Math.abs(Math.sin(timeRef.current * 2));
                }
                break;
        }
    });

    return (
        <group position={position}>
            {/* Invisible hover sphere for pointer events */}
            <mesh
                ref={hoverSphereRef}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onClick={handleClick}
            >
                <sphereGeometry args={[hoverSphereRadius, 16, 16]} />
                <meshBasicMaterial
                    transparent
                    opacity={0}
                    depthWrite={false}
                />
            </mesh>

            {/* Particle cloud */}
            <points
                ref={pointsRef}
                geometry={geometry}
                material={material}
            />

            {/* URL Label below node */}
            <Text
                position={[0, -effectiveSize * 1.8, 0]}
                fontSize={0.8}
                color="#ffffff"
                anchorX="center"
                anchorY="top"
                outlineWidth={0.05}
                outlineColor="#000000"
                maxWidth={15}
                textAlign="center"
            >
                {nodeName.length > 20 ? nodeName.substring(0, 20) + '...' : nodeName}
            </Text>

            {/* Hover highlight ring */}
            {isHovered && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[effectiveSize * 1.3, effectiveSize * 1.4, 32]} />
                    <meshBasicMaterial
                        color={STATUS_COLORS[status]}
                        transparent
                        opacity={0.6}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </group>
    );
}
