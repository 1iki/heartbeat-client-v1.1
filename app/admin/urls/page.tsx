"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SingleAuthModal } from "@/components/admin/SingleAuthModal";
import { BulkAuthModal } from "@/components/admin/BulkAuthModal";

interface Node {
    id: string;
    name: string;
    url: string;
    group: string;
    status: string;
    latency: number;
    lastChecked: string;
    authConfig?: {
        type: string;
        username?: string;
    };
}

export default function AdminUrlsPage() {
    const router = useRouter();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Auth Modal State
    const [isSingleAuthOpen, setIsSingleAuthOpen] = useState(false);
    const [selectedNodeForAuth, setSelectedNodeForAuth] = useState<string | null>(null);
    const [isBulkAuthOpen, setIsBulkAuthOpen] = useState(false);

    // Fetch nodes
    useEffect(() => {
        const abortController = new AbortController();
        fetchNodes(abortController.signal);
        
        return () => {
            abortController.abort();
        };
    }, []);

    const fetchNodes = async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch("/api/nodes", { signal });
            const data = await response.json();

            if (data.success) {
                setNodes(data.data || []);
            } else {
                setError(data.error || "Failed to fetch nodes");
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch nodes");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        try {
            setDeleting(id);
            const response = await fetch(`/api/nodes/${id}`, {
                method: "DELETE"
            });

            const data = await response.json();

            if (data.success) {
                // Remove from list
                setNodes(nodes.filter(n => n.id !== id));
            } else {
                alert(`Failed to delete: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        } finally {
            setDeleting(null);
        }
    };

    const handleCheckNow = async (id: string) => {
        try {
            const response = await fetch(`/api/nodes/${id}/check`, {
                method: "POST"
            });

            const data = await response.json();

            if (data.success) {
                // Refresh the list
                fetchNodes();
                alert("Health check initiated!");
            } else {
                alert(`Check failed: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Check failed: ${err.message}`);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "STABLE": return "bg-status-stable/20 text-status-stable border-status-stable/30";
            case "FRESH": return "bg-status-fresh/20 text-status-fresh border-status-fresh/30";
            case "WARNING": return "bg-status-warning/20 text-status-warning border-status-warning/30";
            case "DOWN": return "bg-status-down/20 text-status-down border-status-down/30";
            default: return "bg-white/10 text-white/60 border-white/20";
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">🔗 Manage URLs</h1>
                        <p className="text-white/60">Manage monitored URLs and their configurations</p>
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="text-white/60">Loading nodes...</div>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
                        <p className="text-red-400">❌ Error: {error}</p>
                        <button
                            onClick={() => fetchNodes()}
                            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition"
                        >
                            Retry
                        </button>
                    </div>
                ) : nodes.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-lg">
                        <p className="text-white/60 mb-4">No URLs configured yet</p>
                        <p className="text-sm text-white/40">
                            Use the scripts or API to add monitored URLs
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setIsBulkAuthOpen(true)}
                                className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-600/30 rounded-lg transition text-sm flex items-center gap-2"
                            >
                                🔐 Bulk Auth Config
                            </button>
                        </div>
                        <div className="glass border border-white/10 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="text-left px-6 py-4 font-semibold">Name</th>
                                        <th className="text-left px-6 py-4 font-semibold">URL</th>
                                        <th className="text-left px-6 py-4 font-semibold">Group</th>
                                        <th className="text-left px-6 py-4 font-semibold">Status</th>
                                        <th className="text-left px-6 py-4 font-semibold">Auth</th>
                                        <th className="text-left px-6 py-4 font-semibold">Latency</th>
                                        <th className="text-right px-6 py-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {nodes.map((node) => (
                                        <tr key={node.id} className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4 font-medium">{node.name}</td>
                                            <td className="px-6 py-4">
                                                <a
                                                    href={node.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 transition font-mono text-sm"
                                                >
                                                    {node.url.length > 50
                                                        ? node.url.substring(0, 50) + "..."
                                                        : node.url}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs">
                                                    {node.group}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 border rounded-full text-xs font-bold ${getStatusColor(node.status)}`}>
                                                    {node.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {node.authConfig?.type && node.authConfig.type !== "NONE" ? (
                                                        <span className="text-green-400 text-xs border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded">{node.authConfig.type}</span>
                                                    ) : (
                                                        <span className="text-white/30 text-xs">-</span>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedNodeForAuth(node.id);
                                                            setIsSingleAuthOpen(true);
                                                        }}
                                                        className="text-xs text-white/50 hover:text-white underline decoration-white/30"
                                                    >
                                                        Config
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm">
                                                    {node.latency ? `${node.latency}ms` : "-"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCheckNow(node.id)}
                                                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-xs transition"
                                                        title="Check now"
                                                    >
                                                        🔄 Check
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(node.id, node.name)}
                                                        disabled={deleting === node.id}
                                                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-xs transition disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {deleting === node.id ? "..." : "🗑️ Delete"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Summary */}
                            <div className="bg-white/5 px-6 py-4 border-t border-white/10">
                                <div className="text-sm text-white/60">
                                    Total: {nodes.length} URLs |
                                    Stable: {nodes.filter(n => n.status === "STABLE").length} |
                                    Fresh: {nodes.filter(n => n.status === "FRESH").length} |
                                    Warning: {nodes.filter(n => n.status === "WARNING").length} |
                                    Down: {nodes.filter(n => n.status === "DOWN").length}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <SingleAuthModal
                nodeId={selectedNodeForAuth}
                isOpen={isSingleAuthOpen}
                onClose={() => {
                    setIsSingleAuthOpen(false);
                    setSelectedNodeForAuth(null);
                }}
                onSave={fetchNodes}
            />

            <BulkAuthModal
                isOpen={isBulkAuthOpen}
                onClose={() => setIsBulkAuthOpen(false)}
                onSave={fetchNodes}
            />
        </div>
    );
}