"use client";

import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MapControls, OrthographicCamera } from "@react-three/drei";
import { VisualizationMode } from "@/types";
import { CAMERA_CONFIG, VIEWPORT_MARGINS } from "@/lib/constants";
import * as THREE from "three";

/**
 * Camera Controller Component
 * Manages orthographic camera for flat 2D-like projection
 * FRONTEND ONLY
 */

interface CameraControllerProps {
    mode: VisualizationMode;
    focusTarget?: { x: number; y: number; z: number } | null;
}

export function CameraController({ mode, focusTarget }: CameraControllerProps) {
    const { camera, size } = useThree();
    const mapControlsRef = useRef<any>(null);

    // Calculate frustum size based on viewport
    const frustum = React.useMemo(() => {
        const config = CAMERA_CONFIG[mode.toUpperCase() as keyof typeof CAMERA_CONFIG];
        const aspect = size.width / size.height;

        // Account for safe margins in frustum calculation
        const effectiveWidth = size.width - VIEWPORT_MARGINS.LEFT - VIEWPORT_MARGINS.RIGHT;
        const effectiveHeight = size.height - VIEWPORT_MARGINS.TOP - VIEWPORT_MARGINS.BOTTOM;
        const effectiveAspect = effectiveWidth / effectiveHeight;

        // For Atom mode, we want 1:1 pixel mapping, so frustum size is half height.
        // For others, use config default.
        const frustumSize = mode === 'Atom' ? size.height / 2 : config?.frustumSize || 400;

        return {
            size: frustumSize,
            aspect: effectiveAspect,
        };
    }, [mode, size]);

    // Auto-focus on target (for DOWN nodes in Atom mode)
    useEffect(() => {
        if (focusTarget && mapControlsRef.current) {
            // Smoothly animate the target
            // Note: For MapControls with Orthographic camera, we usually pan via target
            mapControlsRef.current.target.set(focusTarget.x, focusTarget.y, 0);
            mapControlsRef.current.update();
        }
    }, [focusTarget]);

    // Get configuration for current mode (handle case variations)
    const configKey = mode.toUpperCase() as keyof typeof CAMERA_CONFIG;
    const config = CAMERA_CONFIG[configKey] || CAMERA_CONFIG[mode as keyof typeof CAMERA_CONFIG] || CAMERA_CONFIG.ATOM;

    return (
        <>
            <OrthographicCamera
                makeDefault
                position={[0, 0, 100]}
                zoom={config?.zoom || 1}
                near={config?.near || 0.1}
                far={config?.far || 1000}
                left={-frustum.size * frustum.aspect}
                right={frustum.size * frustum.aspect}
                top={frustum.size}
                bottom={-frustum.size}
            />

            <MapControls
                ref={mapControlsRef}
                enableDamping
                dampingFactor={0.05}
                enableRotate={false}  // Disable rotation for flat view - strictly 2D
                minZoom={0.001}       // Unlimited zoom out
                maxZoom={1000}        // Unlimited zoom in
                mouseButtons={{
                    LEFT: THREE.MOUSE.PAN,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.PAN,
                }}
                // Adjust pan speed if needed, though default is usually fine
                screenSpacePanning={true}
            />
        </>
    );
}
