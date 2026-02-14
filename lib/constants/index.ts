import { NodeStatus, StatusVisualConfig } from "@/types";

/**
 * STATUS TO VISUAL MAPPING
 * Frontend-only constants
 * Backend MUST NOT use these
 */
export const STATUS_COLORS: Record<NodeStatus, string> = {
    STABLE: "#00A3FF",   // Blue
    FRESH: "#00FF94",    // Green
    WARNING: "#FFD600",  // Yellow
    DOWN: "#FF4842",     // Red
};

export const STATUS_VISUAL_CONFIG: Record<NodeStatus, StatusVisualConfig> = {
    STABLE: {
        color: "#00A3FF",
        animation: "breathing",
        intensity: 0.7,
    },
    FRESH: {
        color: "#00FF94",
        animation: "pulse",
        intensity: 1.0,
    },
    WARNING: {
        color: "#FFD600",
        animation: "jitter",
        intensity: 0.9,
    },
    DOWN: {
        color: "#FF4842",
        animation: "disperse",
        intensity: 1.2,
    },
};

/**
 * Particle Configuration
 * Desktop vs Mobile particle counts
 */
export const PARTICLE_CONFIG = {
    DESKTOP: {
        MIN: 2000,
        MAX: 10000,
        DEFAULT: 4000,  // Increased from 3000 - more detail
    },
    MOBILE: {
        MAX: 1000,  // Increased from 800
    },
};

/**
 * Animation Configuration
 */
export const ANIMATION_CONFIG = {
    BREATHING: {
        duration: 3,
        opacityRange: [0.7, 1.0],
    },
    PULSE: {
        duration: 1.5,
        scaleRange: [1.0, 1.2],
    },
    JITTER: {
        duration: 0.3,
        displacement: 2,
    },
    DISPERSE: {
        duration: 2,
        spreadRadius: 1.5,
    },
};

/**
 * Particle Distribution Parameters
 * For fuzzy edge effect
 */
export const PARTICLE_DISTRIBUTION = {
    BASE_RADIUS: 4.0,  // Node size - tetap besar untuk visibility
    FUZZY_SCOPE: 0.8,  // Fuzzy edge effect
    DIRECTION_RANGE: [-1, 1],
    POWER_CURVE: 3,  // cubic distribution
};

/**
 * Layout Engine Configuration
 * Optimized based on HTML examples for tighter spacing
 */
export const LAYOUT_CONFIG = {
    ATOM: {
        centerStrength: 0.8,   // Much stronger centering for dense packing
        collisionRadius: 5,    // ✅ TAHAP 7.5: Increased from 1 to 5 (collision fix)
        linkDistance: 0,
    },
    ALERTS: {
        centerStrength: 0.1,
        collisionRadius: 1,
        linkDistance: 0,
    }
};

/**
 * Camera Configuration per Mode
 * Using Orthographic camera for flat, 2D-like projection
 */
export const CAMERA_CONFIG = {
    ATOM: {
        type: "orthographic",  // Changed to orthographic for flat view
        zoom: 1,
        near: 0.1,
        far: 1000,
        position: [0, 0, 100],  // Position Z for orthographic
        frustumSize: 400,  // Viewport size for orthographic camera
    },
    ALERTS: {
        type: "orthographic",
        zoom: 1,
        near: 0.1,
        far: 1000,
        position: [0, 0, 100],
        frustumSize: 400,
    },
    VECTOR: {
        type: "orthographic",
        zoom: 1,
        near: 0.1,
        far: 1000,
        position: [0, 0, 100],
        frustumSize: 400,
    },
    // Alias untuk lowercase (safety fallback)
    vector: {
        type: "orthographic",
        zoom: 1,
        near: 0.1,
        far: 1000,
        position: [0, 0, 100],
        frustumSize: 400,
    },
    NEURON: {
        type: "orthographic",  // Changed to orthographic for consistent flat view
        zoom: 1,
        near: 0.1,
        far: 1000,
        position: [0, 0, 100],
        frustumSize: 450,
        autoRotate: false,  // Disable auto-rotate for flat view
    },
};

/**
 * Viewport Safe Margins
 * Buffer space from screen edges to prevent nodes going off-screen
 */
export const VIEWPORT_MARGINS = {
    TOP: 100,     // Space for header (88px) + buffer
    BOTTOM: 50,   // Bottom margin
    LEFT: 50,     // Left margin
    RIGHT: 50,    // Right margin
};

/**
 * Audio Alert Configuration
 */
export const AUDIO_CONFIG = {
    THROTTLE_MS: 5000,  // Max 1 sound per 5 seconds
    RECOVERY_SOUND: "/sounds/ping.mp3",
    CRITICAL_SOUND: "/sounds/alarm.mp3",
};

/**
 * Polling Configuration
 */
export const POLLING_CONFIG = {
    INTERVAL_MS: 5000,  // Poll every 5 seconds
    FOCUS_REVALIDATION: true,
};

/**
 * UI Constants
 * ✅ TAHAP 3: Extracted magic numbers for maintainability
 */
export const UI_CONSTANTS = {
    TOOLTIP: {
        OFFSET_X: 15,              // Horizontal offset from cursor
        OFFSET_Y: 15,              // Vertical offset from cursor
        MAX_WIDTH: 200,            // Maximum tooltip width
    },
    NODE: {
        HOVER_SIZE_MULTIPLIER: 1.2,  // Hover sphere size multiplier
        LABEL_OFFSET_Y: -3,          // Label Y offset from node
        BASE_SIZE: 2.0,              // Default node size
    },
    LAYOUT: {
        MAX_ITERATIONS: 800,              // Maximum D3 force iterations
        BASE_ITERATIONS: 100,             // Minimum iterations
        ITERATIONS_PER_NODE: 8,           // Additional iterations per node
        CONVERGENCE_THRESHOLD: 0.01,      // Alpha change threshold for convergence
        CONVERGENCE_CHECK_INTERVAL: 50,   // Check convergence every N iterations
        CONVERGENCE_MIN_ITERATIONS: 100,  // Min iterations before checking convergence
        ALPHA_THRESHOLD: 0.05,            // Alpha value threshold for stability
    },
    RESIZE: {
        DEBOUNCE_MS: 200,           // Debounce delay for resize events
    },
    ANIMATION: {
        LAYOUT_DEFER_MS: 0,         // Defer layout calculation (setTimeout)
    },
};
