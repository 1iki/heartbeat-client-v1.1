"use client";

import React, { useState, useEffect } from "react";
import { AuthConfig } from "@/types";
import { AuthConfigForm } from "./AuthConfigForm";

interface SingleAuthModalProps {
    nodeId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function SingleAuthModal({ nodeId, isOpen, onClose, onSave }: SingleAuthModalProps) {
    const [authConfig, setAuthConfig] = useState<AuthConfig>({ type: "NONE" });
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nodeName, setNodeName] = useState("");

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen || !nodeId) {
            // Reset on close
            setAuthConfig({ type: "NONE" });
            setError(null);
            setNodeName("");
            return;
        }

        setIsLoading(true);
        setError(null);

        console.log(`[SingleAuth] Loading node: ${nodeId}`);

        fetch(`/api/nodes/${nodeId}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    setAuthConfig(data.data.authConfig || { type: "NONE" });
                    setNodeName(data.data.name);
                    console.log(`[SingleAuth] Loaded config for ${data.data.name}:`, data.data.authConfig?.type || "NONE");
                } else {
                    setError("Failed to fetch node: " + (data.error || "Unknown error"));
                }
            })
            .catch(err => {
                console.error("[SingleAuth] Error loading node:", err);
                setError("Error loading node details: " + err.message);
            })
            .finally(() => setIsLoading(false));

    }, [isOpen, nodeId]);

    const handleSave = async () => {
        if (!nodeId) return;

        setIsSaving(true);
        setError(null);

        console.log(`[SingleAuth] Saving config for node ${nodeId}:`, {
            type: authConfig.type,
            hasUsername: !!authConfig.username,
            hasPassword: !!authConfig.password
        });

        try {
            const res = await fetch(`/api/nodes/${nodeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ authConfig })
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            console.log("[SingleAuth] Save response:", data);

            if (data.success) {
                onSave();
                onClose();
            } else {
                setError(data.error || "Failed to update authentication settings");
            }
        } catch (err: any) {
            const errorMsg = err.message || "Error saving authentication settings";
            console.error("[SingleAuth] Save error:", err);
            setError(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg glass rounded-lg shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        🔑 Autentikasi: <span className="text-status-fresh">{nodeName || "Memuat..."}</span>
                    </h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-white/60">Memuat...</div>
                ) : (
                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <AuthConfigForm
                            config={authConfig}
                            onChange={setAuthConfig}
                        />

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-status-fresh text-black font-semibold rounded hover:bg-status-fresh/80 transition disabled:opacity-50"
                            >
                                {isSaving ? "Menyimpan..." : "Simpan Konfigurasi"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
