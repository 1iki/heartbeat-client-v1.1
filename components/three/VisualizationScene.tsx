"use client";

import React, { useEffect, useMemo, useState, useCallback, startTransition } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { FuzzyParticleNode } from "./FuzzyParticleNode";
import { getDetailedErrorMessage } from "@/lib/errorMappings";
import { EdgeRenderer } from "./EdgeRenderer";
import { CameraController } from "./CameraController";
import { useNodeData } from "@/lib/hooks/useNodeData";
import { useUIStore } from "@/lib/stores/uiStore";
import { useVisualizationStore } from "@/lib/stores/visualizationStore";
import { calculateAtomLayout, findAtomFocusTarget } from "@/lib/layouts/AtomLayout";
import { ErrorCardFeed } from "../alerts/ErrorCardFeed";
import { NodeData, NodePosition, NodeStatus } from "@/types";
import { ThreeJSErrorBoundary } from "../ErrorBoundary";
import { UI_CONSTANTS } from "@/lib/constants";
import { LoadingSpinnerInline } from "../ui/LoadingSpinner";

/**
 * Main Visualization Scene
 * Renders particle nodes with appropriate layout based on mode  
 * FRONTEND ONLY - NOW WITH HOVER TOOLTIP & CLICK MODAL
 * ✅ TAHAP 1: Memory leak prevention with separated state
 * ✅ TAHAP 2: Error boundary, optimized resize, loading state
 * ✅ TAHAP 5: Bundle optimization - D3.js lazy loaded
 */

// Lazy load D3 BubbleVectorMap (reduces initial bundle by ~150KB)
const BubbleVectorMap = dynamic(
    () => import("../d3/BubbleVectorMap").then((mod) => mod.BubbleVectorMap),
    {
        ssr: false,
        loading: () => (
            <LoadingSpinnerInline 
                message="Loading D3 visualization..." 
                size="md" 
            />
        ),
    }
);

/**
 * Main Visualization Scene
 * Renders particle nodes with appropriate layout based on mode  
 * FRONTEND ONLY - NOW WITH HOVER TOOLTIP & CLICK MODAL
 * ✅ TAHAP 1: Memory leak prevention with separated state
 * ✅ TAHAP 2: Error boundary, optimized resize, loading state
 */

/**
 * Memoized Tooltip Content Component
 * Prevents re-renders when only position changes
 */
const TooltipContent = React.memo(({ 
    nodeName, 
    status, 
    errorDetail 
}: {
    nodeName: string;
    status: NodeStatus;
    errorDetail: ReturnType<typeof getDetailedErrorMessage>;
}) => {
    const isWarning = status === "WARNING";
    const titleColor = isWarning ? "text-status-warning" : "text-status-down";
    
    return (
        <div className="glass px-4 py-3 rounded-lg border-2 border-white/20 shadow-lg min-w-[200px] bg-black/80 backdrop-blur-md">
            <div className="font-bold text-white mb-1">{nodeName}</div>
            <div className="flex items-center gap-2 mb-2">
                <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                        status === "STABLE"
                            ? "bg-status-stable/20 text-status-stable"
                            : status === "FRESH"
                            ? "bg-status-fresh/20 text-status-fresh"
                            : status === "WARNING"
                            ? "bg-status-warning/20 text-status-warning"
                            : "bg-status-down/20 text-status-down"
                    }`}
                >
                    {status}
                </span>
            </div>

            {errorDetail && (
                <div className="mt-2 pt-2 border-t border-white/20">
                    <div className={`${titleColor} font-bold text-xs mb-1`}>
                        {errorDetail.title}
                    </div>
                    <div className="text-[10px] text-white/80 leading-tight">
                        {errorDetail.description}
                    </div>
                </div>
            )}

            <div className="text-xs text-white/60 mt-2 pt-1 border-t border-white/10">
                💡 Klik untuk melihat detail
            </div>
        </div>
    );
});

TooltipContent.displayName = 'TooltipContent';

export function VisualizationScene() {
    const { nodes, isLoading, isConfigError, configMessage } = useNodeData();
    const visualizationMode = useUIStore((state) => state.visualizationMode);
    const setLoading = useUIStore((state) => state.setLoading);
    const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);

    const { nodePositions, edges, setNodePositions, setEdges } = useVisualizationStore();

    // ✅ FIX: Separate tooltip state to prevent dependency cycles
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [tooltipData, setTooltipData] = useState<{
        nodeName: string;
        status: NodeStatus;
        extraData?: any;
    }>({
        nodeName: "",
        status: "FRESH",
        extraData: {}
    });

    // Track window dimensions for responsive layout
    const [dimensions, setDimensions] = useState({ 
        width: typeof window !== 'undefined' ? window.innerWidth : 1920, 
        height: typeof window !== 'undefined' ? window.innerHeight : 1080 
    });

    // ✅ TAHAP 2: Optimized resize with startTransition + requestAnimationFrame
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            // Use startTransition for non-blocking state update
            startTransition(() => {
                setDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            });
        };

        // Initial measurement
        handleResize();

        // Debounced + requestAnimationFrame for smooth updates
        let timeoutId: NodeJS.Timeout;
        let rafId: number;
        
        const optimizedResize = () => {
            clearTimeout(timeoutId);
            cancelAnimationFrame(rafId);
            
            timeoutId = setTimeout(() => {
                rafId = requestAnimationFrame(handleResize);
            }, UI_CONSTANTS.RESIZE.DEBOUNCE_MS);
        };

        window.addEventListener('resize', optimizedResize, { passive: true });
        
        return () => {
            window.removeEventListener('resize', optimizedResize);
            clearTimeout(timeoutId);
            cancelAnimationFrame(rafId);
        };
    }, []);

    // ✅ TAHAP 2: Calculate layout with loading state (non-blocking)
    useEffect(() => {
        if (nodes.length === 0) return;

        // Show loading state immediately for heavy calculations
        setLoading(true);

        // Defer heavy calculation to next tick (prevents UI freeze)
        const timeoutId = setTimeout(() => {
            let newPositions: Map<string, NodePosition>;
            let newEdges: any[] = [];

            switch (visualizationMode) {
                case "Atom":
                    newPositions = calculateAtomLayout(nodes, dimensions.width, dimensions.height);
                    break;

                // Alerts mode is 2D HTML, no layout calculation needed here
                case "alerts":
                    newPositions = new Map();
                    break;

                default:
                    newPositions = new Map();
            }

            setNodePositions(newPositions);
            setEdges(newEdges);
            setLoading(false);
        }, UI_CONSTANTS.ANIMATION.LAYOUT_DEFER_MS); // Defer to next tick

        return () => clearTimeout(timeoutId);
    }, [nodes, visualizationMode, dimensions.width, dimensions.height, setNodePositions, setEdges, setLoading]);

    // ✅ TAHAP 2: Fix useMemo with serialized nodePositions (stable dependency)
    const nodePositionsJSON = useMemo(
        () => JSON.stringify(Array.from(nodePositions.entries())),
        [nodePositions]
    );

    // Find focus target for DOWN nodes in Atom mode
    const focusTarget = useMemo(() => {
        if (visualizationMode === "Atom") {
            return findAtomFocusTarget(nodes, nodePositions);
        }
        return null;
    }, [visualizationMode, nodes, nodePositionsJSON]); // Use JSON string for stable comparison

    // ✅ FIX: Use useCallback for stable reference to prevent re-attachment
    const handleMouseMove = useCallback((e: MouseEvent) => {
        setTooltipPosition({ x: e.clientX, y: e.clientY });
    }, []);

    // ✅ FIX: Attach/detach mouse listener based on visibility only
    useEffect(() => {
        if (!tooltipVisible) return;

        window.addEventListener("mousemove", handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [tooltipVisible, handleMouseMove]);

    // Handle node hover - Show tooltip
    const handleNodeHover = useCallback((nodeId: string, nodeName: string, status: NodeStatus, event: any, extraData?: any) => {
        try {
            // Extract mouse position from Three.js event
            const mouseX = event.nativeEvent?.clientX || event.clientX || 0;
            const mouseY = event.nativeEvent?.clientY || event.clientY || 0;

            setTooltipPosition({ x: mouseX, y: mouseY });
            setTooltipData({
                nodeName,
                status,
                extraData: extraData || {}
            });
            setTooltipVisible(true);
        } catch (error) {
            // Silent fail on tooltip error to prevent crash
            console.warn('Tooltip error:', error);
        }
    }, []);

    const handleNodeUnhover = useCallback(() => {
        // ✅ FIX: Immediately hide tooltip when mouse leaves node
        setTooltipVisible(false);
    }, []);

    const handleNodeClick = useCallback((nodeId: string) => {
        // ✅ FIX: Hide tooltip immediately when clicking (modal will show)
        setTooltipVisible(false);
        setSelectedNodeId(nodeId);
    }, [setSelectedNodeId]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="canvas-container flex items-center justify-center">
                <div className="text-white text-xl">Memuat visualisasi...</div>
            </div>
        );
    }

    // Show configuration error message
    if (isConfigError || nodes.length === 0) {
        return (
            <div className="canvas-container flex items-center justify-center">
                <div className="max-w-2xl mx-auto p-8 glass rounded-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        {isConfigError ? "⚙️ Konfigurasi Diperlukan" : "🌟 Selamat Datang di Pemantauan Visual!"}
                    </h2>

                    {isConfigError && (
                        <div className="mb-4 p-4 bg-status-warning/10 border border-status-warning/30 rounded-lg">
                            <p className="text-status-warning text-sm font-medium">
                                {configMessage}
                            </p>
                        </div>
                    )}

                    <p className="text-white/80 mb-6">
                        {isConfigError
                            ? "Platform memerlukan koneksi MongoDB untuk menyimpan dan memantau layanan Anda."
                            : "Belum ada layanan yang dikonfigurasi. Mari kita mulai!"
                        }
                    </p>

                    <div className="space-y-4 text-left">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Pengaturan Cepat:</h3>
                            <ol className="list-decimal list-inside space-y-3 text-white/70">
                                {isConfigError && (
                                    <li>
                                        <strong className="text-white">Konfigurasi MongoDB:</strong>
                                        <div className="ml-6 mt-2 bg-black/30 p-3 rounded font-mono text-xs text-white/60 overflow-x-auto">
                                            # Create .env.local file<br />
                                            MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/monitoring
                                        </div>
                                        <p className="ml-6 mt-2 text-xs text-white/50">
                                            Dapatkan MongoDB Atlas gratis: <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noopener" className="text-status-fresh hover:underline">mongodb.com/cloud/atlas</a>
                                        </p>
                                    </li>
                                )}
                                <li>
                                    <strong className="text-white">Tambahkan layanan pertama Anda:</strong>
                                    <div className="ml-6 mt-2 bg-black/30 p-3 rounded font-mono text-xs text-white/60 overflow-x-auto">
                                        curl -X POST http://localhost:3000/api/nodes \<br />
                                        &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                                        &nbsp;&nbsp;-d '&#123;"name":"Example Service","url":"https://example.com","group":"Backend"&#125;'
                                    </div>
                                </li>
                                <li>
                                    <strong className="text-white">Gunakan Panel Admin:</strong> Buka{" "}
                                    <a href="/admin/urls" className="text-status-fresh hover:underline">/admin/urls</a>
                                </li>
                            </ol>
                        </div>

                        {isConfigError && (
                            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-blue-300 text-sm">
                                    💡 <strong>Tip:</strong> Setelah mengatur MongoDB, restart server pengembangan dengan <code className="bg-white/10 px-2 py-0.5 rounded">npm run dev</code>
                                </p>
                            </div>
                        )}
                    </div>

                    <p className="text-white/60 mt-6 text-sm border-t border-white/10 pt-4">
                        📚 Butuh bantuan? Periksa <code className="bg-white/10 px-2 py-1 rounded">QUICKSTART.md</code> untuk instruksi detail.
                    </p>
                </div>
            </div>
        );
    }

    // New D3 Vector Mode
    if (visualizationMode === "vector") {
        return (
            <div className="canvas-container relative">
                <BubbleVectorMap />
            </div>
        );
    }

    // Alerts Mode
    if (visualizationMode === "alerts") {
        return (
            <div className="canvas-container relative bg-black/40 backdrop-blur-sm">
                <ErrorCardFeed />
            </div>
        );
    }

    // ✅ TAHAP 2: Render Three.js scene with Error Boundary protection
    return (
        <div className="canvas-container relative">
            <ThreeJSErrorBoundary>
                <Canvas
                    camera={{ position: [0, 0, 50], fov: 75 }}
                    gl={{ antialias: true, alpha: true }}
                >
                    {/* Ambient lighting */}
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={0.8} />

                {/* Camera control */}
                <CameraController mode={visualizationMode} focusTarget={focusTarget} />

                {/* Render particle nodes */}
                <group>
                    {nodes.map((node: NodeData) => {
                        const pos = nodePositions.get(node.id);
                        if (!pos) return null;

                        return (
                            <FuzzyParticleNode
                                key={node.id}
                                nodeId={node.id}
                                nodeName={node.name}
                                nodeUrl={node.url}
                                position={[pos.x, pos.y, pos.z]}
                                status={node.status}
                                httpStatus={node.httpStatus}
                                statusMessage={node.statusMessage}
                                size={2.0}
                                onHover={handleNodeHover}
                                onUnhover={handleNodeUnhover}
                                onClick={handleNodeClick}
                            />
                        );
                    })}
                </group>

                {/* Render edges (Tree and Neuron modes) */}
                <EdgeRenderer
                    edges={edges}
                    // Alerts/Vector don't use this. Only Atom uses 'none' which works. 
                    // No neuron link anymore. 
                    mode="none"
                />

                </Canvas>
            </ThreeJSErrorBoundary>

            {/* ✅ FIXED: Hover Tooltip with memoized content */}
            {tooltipVisible && (() => {
                // Memoize error detail calculation
                const nodeInfo = { ...tooltipData.extraData, status: tooltipData.status };
                const errorDetail = getDetailedErrorMessage(nodeInfo);

                return (
                    <div
                        className="fixed z-50 pointer-events-none"
                        style={{
                            left: tooltipPosition.x + UI_CONSTANTS.TOOLTIP.OFFSET_X,
                            top: tooltipPosition.y + UI_CONSTANTS.TOOLTIP.OFFSET_Y,
                            // ✅ Use transform3d for GPU acceleration
                            transform: "translate3d(0, 0, 0)",
                            willChange: "transform"
                        }}
                    >
                        <TooltipContent
                            nodeName={tooltipData.nodeName}
                            status={tooltipData.status}
                            errorDetail={errorDetail}
                        />
                    </div>
                );
            })()}
        </div>
    );
}
