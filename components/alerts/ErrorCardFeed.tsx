"use client";

import React from "react";
import { useNodeData } from "@/lib/hooks/useNodeData";
import { NodeData } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { getDetailedErrorMessage } from "@/lib/errorMappings";

/**
 * Error Feed Component
 * Replaces Neuron mode.
 * Displays "Container Cards" for nodes in DOWN status.
 * Animates from bottom to top.
 */

export function ErrorCardFeed() {
    const { nodes } = useNodeData();

    // Filter for DOWN nodes only (not WARNING)
    // User requirement: "Tidak akan muncul container card jika semua website hanya Fresh, Stable dan Warning"
    const errorNodes = nodes.filter(
        (node: NodeData) => node.status === "DOWN"
    );

    const hasErrors = errorNodes.length > 0;

    return (
        <div className="w-full h-full p-8 overflow-y-auto pt-[100px] flex flex-col items-center">
            <AnimatePresence>
                {hasErrors ? (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {errorNodes.map((node: NodeData, index: number) => (
                            <ErrorCard key={node.id} node={node} index={index} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center mt-20 p-12 glass rounded-2xl border border-status-fresh/30 bg-status-fresh/5 text-center"
                    >
                        <div className="text-6xl mb-6">🛡️</div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            Semua Sistem Berjalan Normal
                        </h2>
                        <p className="text-white/60 text-lg max-w-md">
                            Tidak ada kesalahan kritis terdeteksi. Semua layanan dalam status Stabil, Segar, atau Peringatan.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ErrorCard({ node, index }: { node: NodeData; index: number }) {
    const isWarning = node.status === "WARNING";
    const statusColor = isWarning ? "text-status-warning" : "text-status-down";
    const statusBg = isWarning ? "bg-status-warning" : "bg-status-down";
    const borderColor = isWarning ? "border-status-warning" : "border-status-down";

    return (
        <motion.div
            layout
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                delay: index * 0.05
            }}
            className={`glass p-6 rounded-xl border ${borderColor}/50 ${statusBg}/10 relative overflow-hidden group hover:${statusBg}/15 transition-colors`}
        >
            {/* Status Indicator Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusBg}`} />

            <div className="flex justify-between items-start mb-4 pl-3">
                <div>
                    <h3 className={`text-xl font-bold text-white group-hover:${statusColor} transition-colors truncate max-w-[200px]`} title={node.name}>
                        {node.name}
                    </h3>
                    <div className="text-xs text-white/50 font-mono mt-1 break-all">
                        {node.url}
                    </div>
                </div>
                <div className={`${statusBg}/20 ${statusColor} px-3 py-1 rounded text-xs font-bold uppercase tracking-wider animate-pulse`}>
                    {node.status}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-3">
                <div className="bg-black/20 p-3 rounded-lg">
                    <div className="text-xs text-white/40 uppercase font-bold mb-1">Latensi</div>
                    <div className={`text-lg font-mono ${isWarning && node.latency > 1000 ? "text-status-warning" : "text-white"}`}>
                        {node.latency ? `${node.latency}ms` : "TIMEOUT"}
                    </div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg">
                    <div className="text-xs text-white/40 uppercase font-bold mb-1">Info HTTP</div>
                    <div className="text-lg font-mono text-white">
                        {node.httpStatus || "N/A"}
                    </div>
                </div>
            </div>

            {/* Enhanced Error Message Section */}
            {(node.statusMessage || node.httpStatus || isWarning) && (
                <div className="mt-4 pl-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-white/40 uppercase font-bold mb-1">
                        {isWarning ? "Analisa Peringatan" : "Analisa Error"}
                    </div>
                    {(() => {
                        const errorDetail = getDetailedErrorMessage(node);
                        if (errorDetail) {
                            return (
                                <div className={`${statusBg}/10 border ${borderColor}/30 p-3 rounded text-sm text-white/90`}>
                                    <div className={`font-bold ${statusColor} mb-1`}>{errorDetail.title}</div>
                                    <div className="text-xs opacity-90 leading-relaxed">{errorDetail.description}</div>
                                </div>
                            );
                        }
                        // Fallback if no specific detailed mapping found, but message exists
                        return node.statusMessage ? (
                            <p className={`text-sm ${statusColor}/90 font-mono bg-black/30 p-2 rounded`}>
                                {node.statusMessage}
                            </p>
                        ) : null;
                    })()}
                </div>
            )}

            <div className={`absolute top-0 right-0 p-4 opacity-10 font-[900] text-6xl ${statusColor} pointer-events-none transform translate-x-4 -translate-y-4`}>
                !
            </div>
        </motion.div>
    );
}
