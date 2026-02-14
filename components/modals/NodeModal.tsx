"use client";

import React, { useState, useEffect } from "react";
import { NodeData, NodeGroup, AuthConfig } from "@/types";
import { useUIStore } from "@/lib/stores/uiStore";
import { AuthConfigForm } from "../admin/AuthConfigForm";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function NodeModal() {
    const selectedNodeId = useUIStore((state) => state.selectedNodeId);
    const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);
    const [nodeData, setNodeData] = useState<NodeData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Check loading state
    const [isChecking, setIsChecking] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<NodeData> & { authConfig: AuthConfig }>({
        name: "",
        url: "",
        group: "website",
        authConfig: { type: "NONE" }
    });
    const [isSaving, setIsSaving] = useState(false);

    // Fetch node details when modal opens
    useEffect(() => {
        if (!selectedNodeId) {
            // Cleanup when modal closes
            setNodeData(null);
            setIsEditing(false);
            setIsChecking(false);
            setIsSaving(false);
            setFormData({
                name: "",
                url: "",
                group: "website",
                authConfig: { type: "NONE" }
            });
            return;
        }

        setIsLoading(true);
        
        // AbortController untuk cleanup on unmount
        const abortController = new AbortController();
        
        fetch(`/api/nodes/${selectedNodeId}`, { signal: abortController.signal })
            .then((res) => res.json())
            .then((data) => {
                if (abortController.signal.aborted) return;
                
                const node = data.data || data;
                setNodeData(node);
                setFormData({
                    name: node.name,
                    url: node.url,
                    group: node.group,
                    authConfig: node.authConfig || { type: "NONE" },
                    description: node.description
                });
                setIsLoading(false);
            })
            .catch((err) => {
                if (abortController.signal.aborted) return;
                console.error("Failed to fetch node details:", err);
                setIsLoading(false);
            });
            
        // Cleanup function
        return () => {
            abortController.abort();
        };
    }, [selectedNodeId]);

    const handleClose = () => {
        setSelectedNodeId(null);
    };

    const handleSave = async () => {
        if (!selectedNodeId) return;
        setIsSaving(true);

        try {
            const res = await fetch(`/api/nodes/${selectedNodeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                setNodeData(data.data);
                setIsEditing(false);
            } else {
                alert("Failed to update: " + data.error);
            }
        } catch (err) {
            alert("Error updating node");
        } finally {
            setIsSaving(false);
        }
    };

    if (!selectedNodeId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-3xl glass rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0a0a0ab0] backdrop-blur-md z-10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-3xl">
                            {nodeData?.status === "STABLE" ? "✓" : nodeData?.status === "FRESH" ? "⚡" : nodeData?.status === "WARNING" ? "⚠️" : "✕"}
                        </span>
                        {isEditing ? "Edit Node" : (nodeData?.name || "Memuat...")}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={handleClose}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                        <Spinner size="lg" className="text-status-fresh" />
                        <div className="text-white/60 animate-pulse">Memuat detail node...</div>
                    </div>
                ) : isEditing ? (
                    <div className="p-6 space-y-6">
                        {/* Form Inputs */}
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Nama</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>URL</Label>
                                <Input
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Grup</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-status-fresh text-white [&>option]:bg-gray-800 [&>option]:text-white [&>option]:py-2"
                                        value={formData.group}
                                        onChange={e => setFormData({ ...formData, group: e.target.value as NodeGroup })}
                                    >
                                        <option value="website" className="bg-gray-800 text-white">Website</option>
                                        <option value="api" className="bg-gray-800 text-white">API</option>
                                        <option value="service" className="bg-gray-800 text-white">Layanan</option>
                                        <option value="database" className="bg-gray-800 text-white">Database</option>
                                        <option value="backend" className="bg-gray-800 text-white">Backend</option>
                                        <option value="frontend" className="bg-gray-800 text-white">Frontend</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-white/50 rounded-lg p-0">
                                <AuthConfigForm
                                    config={formData.authConfig}
                                    onChange={(newConfig: AuthConfig) => setFormData({ ...formData, authConfig: newConfig })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Deskripsi</Label>
                                <Textarea
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Status Message (Context for Editing) */}
                        {nodeData?.statusMessage && (
                            <Card className={nodeData.status === "DOWN" || nodeData.status === "WARNING" ? "bg-status-down/10 border-status-down/30" : "bg-white/5 border-white/10"}>
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold text-white/60 mb-2">
                                        {nodeData.status === "DOWN" || nodeData.status === "WARNING" ? "❌ Alasan Kesalahan" : "💬 Pesan Server Terakhir"}
                                    </h3>
                                    <p className={`text-sm ${nodeData.status === "DOWN" || nodeData.status === "WARNING" ? "text-status-down font-medium" : "text-white/80"}`}>
                                        {nodeData.statusMessage}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4 border-t border-white/10">
                            <Button className="flex-1 gap-2" onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Spinner size="sm" />}
                                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                            <Button variant="secondary" className="flex-1" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                Batal
                            </Button>
                        </div>
                    </div>
                ) : nodeData ? (
                    <div className="p-6 space-y-6">
                        {/* Status Badge */}
                        <div className="flex items-center gap-4">
                            <Badge status={nodeData.status} className="px-4 py-2 text-sm">
                                {nodeData.status === "STABLE" ? "STABIL" :
                                    nodeData.status === "FRESH" ? "BARU" :
                                        nodeData.status === "WARNING" ? "PERINGATAN" :
                                            "MATI"}
                            </Badge>
                            <div className="text-white/60 text-sm">
                                Terakhir diperiksa: {nodeData.lastChecked ? new Date(nodeData.lastChecked).toLocaleString() : "Belum pernah"}
                            </div>
                        </div>

                        {/* URL Information */}
                        <Card className="bg-white/5 border-white/10 group relative">
                            <CardContent className="p-4">
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition">
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-white/40 hover:text-white">
                                        ✏️ Edit
                                    </Button>
                                </div>
                                <h3 className="text-sm font-bold text-white/60 mb-2">🔗 URL</h3>
                                <a href={nodeData.url} target="_blank" rel="noopener noreferrer" className="text-status-fresh font-mono text-sm break-all hover:underline">
                                    {nodeData.url}
                                </a>
                            </CardContent>
                        </Card>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold text-white/60 mb-2">⚡ Waktu Respon</h3>
                                    <p className={`text-2xl font-bold ${!nodeData.latency ? "text-white/40" :
                                        nodeData.latency < 1000 ? "text-status-fresh" :
                                            nodeData.latency < 3000 ? "text-status-warning" :
                                                "text-status-down"
                                        }`}>
                                        {nodeData.latency ? `${nodeData.latency}ms` : "N/A"}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold text-white/60 mb-2">📡 Status HTTP</h3>
                                    <p className={`text-2xl font-bold ${!nodeData.httpStatus ? "text-white/40" :
                                        nodeData.httpStatus >= 200 && nodeData.httpStatus < 300 ? "text-status-fresh" :
                                            nodeData.httpStatus >= 300 && nodeData.httpStatus < 400 ? "text-status-warning" :
                                                "text-status-down"
                                        }`}>
                                        {nodeData.httpStatus || "N/A"}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Status Message / Reason */}
                        {nodeData.statusMessage && (
                            <Card className={nodeData.status === "DOWN" || nodeData.status === "WARNING" ? "bg-status-down/10 border-status-down/30" : "bg-white/5 border-white/10"}>
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold text-white/60 mb-2">
                                        {nodeData.status === "DOWN" || nodeData.status === "WARNING" ? "❌ Alasan Kesalahan" : "💬 Pesan Status"}
                                    </h3>
                                    <p className={`text-sm ${nodeData.status === "DOWN" || nodeData.status === "WARNING" ? "text-status-down font-medium" : "text-white/80"}`}>
                                        {nodeData.statusMessage}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold text-white/60 mb-2">📦 Tipe Konten</h3>
                                    <p className="text-white capitalize">{nodeData.group || "N/A"}</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold text-white/60 mb-2">🔐 Otentikasi</h3>
                                    <div className="flex items-center justify-between">
                                        <p className="text-white">
                                            {nodeData.authConfig?.type !== 'NONE' ? nodeData.authConfig?.type : "Tidak Ada"}
                                        </p>
                                        {nodeData.authConfig?.type !== 'NONE' && (
                                            <Badge variant="outline" className="text-status-fresh border-status-fresh/30">Dikonfigurasi</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Description */}
                        {nodeData.description && (
                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-bold text-white/60 mb-2">📝 Deskripsi</h3>
                                    <p className="text-white/80 text-sm">{nodeData.description}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4 pt-4 border-t border-white/10">
                            <Button
                                className="flex-1 shadow-lg shadow-status-fresh/20 gap-2"
                                disabled={isChecking}
                                onClick={() => {
                                    setIsChecking(true);
                                    fetch(`/api/nodes/${selectedNodeId}/check`, { method: "POST" })
                                        .then(() => alert("Pemeriksaan dimulai! Node akan diperiksa sebentar lagi."))
                                        .catch((err) => alert("Gagal memulai pemeriksaan: " + err.message))
                                        .finally(() => setIsChecking(false));
                                }}
                            >
                                {isChecking ? <Spinner size="sm" className="text-black" /> : "🔄"}
                                {isChecking ? "Memeriksa..." : "Cek Sekarang"}
                            </Button>
                            <Button
                                variant="outline"
                                className="border-blue-600/30 text-blue-400 bg-blue-600/20 hover:bg-blue-600/30"
                                onClick={() => setIsEditing(true)}
                            >
                                ✏️ Edit
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 flex items-center justify-center">
                        <div className="text-white/60">Data tidak tersedia</div>
                    </div>
                )}
            </div>
        </div>
    );
}
