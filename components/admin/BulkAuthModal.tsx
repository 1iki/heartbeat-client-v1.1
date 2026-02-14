"use client";

import React, { useState, useEffect } from "react";
import { AuthConfig } from "@/types";
import { AuthConfigForm } from "./AuthConfigForm";

interface NodeSummary {
    id: string;
    name: string;
    url: string;
}

interface BulkAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function BulkAuthModal({ isOpen, onClose, onSave }: BulkAuthModalProps) {
    // Selection State
    const [pathFilter, setPathFilter] = useState("");
    const [allNodes, setAllNodes] = useState<NodeSummary[]>([]);
    const [filteredNodes, setFilteredNodes] = useState<NodeSummary[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auth Form State
    const [authConfig, setAuthConfig] = useState<AuthConfig>({ type: "NONE" });

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load nodes on open and reset state on close
    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setPathFilter("");
            setSelectedIds(new Set());
            setAuthConfig({ type: "NONE" });
            setError(null);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        fetch("/api/nodes")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setAllNodes(data.data);
                    setFilteredNodes(data.data);
                } else {
                    setError("Failed to load nodes: " + (data.error || "Unknown error"));
                }
            })
            .catch((err) => {
                console.error("Error loading nodes:", err);
                setError("Failed to load nodes");
            })
            .finally(() => setIsLoading(false));
    }, [isOpen]);

    // specific filtering logic
    useEffect(() => {
        if (!pathFilter.trim()) {
            setFilteredNodes(allNodes);
        } else {
            const lowerFilter = pathFilter.toLowerCase();
            setFilteredNodes(allNodes.filter(n =>
                n.url.toLowerCase().includes(lowerFilter) ||
                n.name.toLowerCase().includes(lowerFilter)
            ));
        }
    }, [pathFilter, allNodes]);

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAllFiltered = () => {
        const next = new Set(selectedIds);
        filteredNodes.forEach(n => next.add(n.id));
        setSelectedIds(next);
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleApply = async () => {
        if (selectedIds.size === 0) {
            setError("No nodes selected. Please select at least one URL.");
            return;
        }

        const confirmMessage = authConfig.type === "NONE" 
            ? `Remove authentication from ${selectedIds.size} node(s)?`
            : `Apply ${authConfig.type} authentication to ${selectedIds.size} node(s)?`;
            
        if (!confirm(confirmMessage)) return;

        setIsSaving(true);
        setError(null);

        console.log(`[BulkAuth] Updating ${selectedIds.size} nodes with config:`, { 
            type: authConfig.type,
            hasUsername: !!authConfig.username,
            hasPassword: !!authConfig.password 
        });

        try {
            const res = await fetch("/api/nodes/bulk-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nodeIds: Array.from(selectedIds),
                    authConfig
                })
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            console.log("[BulkAuth] Response:", data);
            
            if (data.success) {
                const message = `✅ Successfully updated ${data.data.modified} of ${data.data.matched} node(s)`;
                alert(message);
                onSave();
                onClose();
            } else {
                setError(data.error || "Bulk update failed");
            }
        } catch (err: any) {
            const errorMsg = err.message || "Error performing bulk update";
            setError(errorMsg);
            console.error("[BulkAuth] Error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl glass rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0a0a0ab0]">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">🔐 Bulk Auth Management</h2>
                        <p className="text-white/60 text-sm">Apply authentication settings to multiple URLs at once</p>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white text-2xl">×</button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left: Selection Column */}
                    <div className="w-1/2 border-r border-white/10 flex flex-col p-4 bg-white/5">
                        <h3 className="font-bold mb-4 flex justify-between items-center">
                            <span>Select URLs ({selectedIds.size} selected)</span>
                            <div className="text-xs space-x-2">
                                <button onClick={handleSelectAllFiltered} className="text-blue-400 hover:underline">Select Visible</button>
                                <button onClick={handleClearSelection} className="text-white/40 hover:text-white">Clear</button>
                            </div>
                        </h3>

                        <input
                            type="text"
                            placeholder="Filter by URL path (e.g. /login)..."
                            className="w-full bg-black/20 border border-white/10 rounded p-2 mb-4 text-sm"
                            value={pathFilter}
                            onChange={(e) => setPathFilter(e.target.value)}
                        />

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {isLoading ? (
                                <div className="text-center text-white/40 py-8">
                                    <div className="animate-pulse">Loading nodes...</div>
                                </div>
                            ) : filteredNodes.length === 0 ? (
                                <div className="text-center text-white/40 py-8">
                                    <div className="mb-2">🔍 No matching URLs found</div>
                                    {pathFilter && <div className="text-xs">Try a different filter</div>}
                                </div>
                            ) : (
                                filteredNodes.map(node => (
                                    <div
                                        key={node.id}
                                        onClick={() => toggleSelection(node.id)}
                                        className={`flex items-start gap-3 p-3 rounded cursor-pointer transition border ${selectedIds.has(node.id)
                                                ? "bg-blue-500/20 border-blue-500/50"
                                                : "bg-black/20 border-transparent hover:bg-white/5"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(node.id)}
                                            readOnly
                                            className="mt-1"
                                        />
                                        <div className="overflow-hidden">
                                            <div className="font-bold text-sm truncate">{node.name}</div>
                                            <div className="text-xs text-white/60 font-mono truncate">{node.url}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Auth Config Column */}
                    <div className="w-1/2 p-6 flex flex-col overflow-y-auto">
                        <h3 className="font-bold mb-4">Target Configuration</h3>

                        <div className="bg-black/20 rounded-lg p-4 border border-white/10 flex-1">
                            <AuthConfigForm
                                config={authConfig}
                                onChange={setAuthConfig}
                            />
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#0a0a0ab0] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={isSaving || selectedIds.size === 0}
                        className="px-6 py-2 bg-status-fresh text-black font-semibold rounded hover:bg-status-fresh/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "Applying..." : `Apply to ${selectedIds.size} URLs`}
                    </button>
                </div>
            </div>
        </div>
    );
}
