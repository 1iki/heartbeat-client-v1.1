"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/lib/stores/uiStore";
import { VisualizationMode } from "@/types";
import { useSheetsSyncInterval } from "@/lib/hooks/useSheetsSyncInterval";
import { AudioAlertManager } from "@/components/alerts/AudioAlertManager";

/**
 * Persistent Navbar Component
 * Navigation and mode switching with interval controls
 * FRONTEND ONLY
 */

export function Navbar() {
    const pathname = usePathname();
    const {
        visualizationMode,
        setVisualizationMode,
        audioEnabled,
        toggleAudio,
        sheetsSyncEnabled,
        toggleSheetsSync,
        sheetsSyncInterval,
        setSheetsSyncInterval,
        statusCheckEnabled,
        toggleStatusCheck,
        statusCheckInterval,
        setStatusCheckInterval
    } = useUIStore();

    const { isSyncing } = useSheetsSyncInterval();

    // Local states for interval dropdowns visibility
    const [showSyncIntervalMenu, setShowSyncIntervalMenu] = useState(false);
    const [showCheckIntervalMenu, setShowCheckIntervalMenu] = useState(false);

    const isDashboard = pathname === "/dashboard" || pathname === "/";

    const modes: { value: VisualizationMode; label: string }[] = [
        { value: "Atom", label: "Atom" },
        { value: "vector", label: "Bubble" },
        { value: "alerts", label: "🚨" },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/dashboard" className="text-xl font-bold text-white hover:text-blue-400 transition">
                        Detektor Peforma Client
                    </Link>



                    {/* Right Section - Controls */}
                    <div className="flex items-center gap-4">
                        {/* Mode switcher - only show on dashboard */}
                        {isDashboard && (
                            <div className="flex rounded-lg bg-white/5 p-1 gap-1">
                                {modes.map((mode) => (
                                    <button
                                        key={mode.value}
                                        onClick={() => setVisualizationMode(mode.value)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${visualizationMode === mode.value
                                            ? "bg-white/20 text-white"
                                            : "text-white/60 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Google Sheets Sync Toggle with Interval Dropdown */}
                        <div className="relative">
                            <div className="flex items-center gap-0">
                                <button
                                    onClick={toggleSheetsSync}
                                    className={`p-2 rounded-l-lg transition border border-r-0 ${sheetsSyncEnabled
                                        ? "bg-blue-500/30 border-blue-500/50 shadow-lg shadow-blue-500/20"
                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                        }`}
                                    title={sheetsSyncEnabled ? `Sinkronisasi Aktif (${sheetsSyncInterval}d)` : `Sinkronisasi Nonaktif (${sheetsSyncInterval}d)`}
                                >
                                    <svg
                                        className={`w-5 h-5 ${sheetsSyncEnabled ? "text-blue-300" : "text-white/40"
                                            } ${isSyncing ? "animate-spin" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setShowSyncIntervalMenu(!showSyncIntervalMenu)}
                                    className={`px-2 py-2 rounded-r-lg transition border text-xs font-mono ${sheetsSyncEnabled
                                        ? "bg-blue-500/30 border-blue-500/50 text-blue-300"
                                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                        }`}
                                    title="Konfigurasi interval"
                                >
                                    {sheetsSyncInterval}d ▾
                                </button>
                            </div>

                            {/* Dropdown Menu */}
                            {showSyncIntervalMenu && (
                                <div className="absolute top-full mt-1 right-0 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 min-w-[120px]">
                                    {[
                                        { val: 10, label: "10 detik" },
                                        { val: 30, label: "30 detik" },
                                        { val: 60, label: "1 menit" },
                                        { val: 120, label: "2 menit" },
                                        { val: 300, label: "5 menit" }
                                    ].map((opt) => (
                                        <button
                                            key={opt.val}
                                            onClick={() => {
                                                setSheetsSyncInterval(opt.val);
                                                setShowSyncIntervalMenu(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg transition ${sheetsSyncInterval === opt.val ? "bg-blue-500/20 text-blue-300" : ""
                                                }`}
                                        >
                                            {opt.label} {opt.val === 30 && "(bawaan)"}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* URL Status Check Toggle with Interval Dropdown */}
                        <div className="relative">
                            <div className="flex items-center gap-0">
                                <button
                                    onClick={toggleStatusCheck}
                                    className={`p-2 rounded-l-lg transition border border-r-0 ${statusCheckEnabled
                                        ? "bg-green-500/30 border-green-500/50 shadow-lg shadow-green-500/20"
                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                        }`}
                                    title={statusCheckEnabled ? `Cek Status Aktif (${statusCheckInterval}d)` : `Cek Status Nonaktif (${statusCheckInterval}d)`}
                                >
                                    <svg
                                        className={`w-5 h-5 ${statusCheckEnabled ? "text-green-300" : "text-white/40"
                                            } ${statusCheckEnabled ? "animate-pulse" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setShowCheckIntervalMenu(!showCheckIntervalMenu)}
                                    className={`px-2 py-2 rounded-r-lg transition border text-xs font-mono ${statusCheckEnabled
                                        ? "bg-green-500/30 border-green-500/50 text-green-300"
                                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                        }`}
                                    title="Konfigurasi interval"
                                >
                                    {statusCheckInterval === -1 ? "Jadwal Pagi" :
                                        statusCheckInterval < 60 ? `${statusCheckInterval}d` :
                                            statusCheckInterval < 3600 ? `${statusCheckInterval / 60}m` :
                                                `${statusCheckInterval / 3600}j`} ▾
                                </button>
                            </div>

                            {/* Dropdown Menu */}
                            {showCheckIntervalMenu && (
                                <div className="absolute top-full mt-1 right-0 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 min-w-[120px]">
                                    {[
                                        { val: -1, label: "08:00 - 09:00 - 10:00 (Pagi)" },
                                        { val: 5, label: "5 detik" },
                                        { val: 300, label: "5 menit" },
                                        { val: 3000, label: "50 menit" },
                                        { val: 7200, label: "2 jam" },
                                        { val: 18000, label: "5 jam" },
                                        { val: 28800, label: "8 jam" }
                                    ].map((opt) => (
                                        <button
                                            key={opt.val}
                                            onClick={() => {
                                                setStatusCheckInterval(opt.val);
                                                setShowCheckIntervalMenu(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg transition ${statusCheckInterval === opt.val ? "bg-green-500/20 text-green-300" : ""
                                                }`}
                                        >
                                            {opt.label} {opt.val === 5 && "(bawaan)"}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Audio Toggle */}
                        <button
                            onClick={toggleAudio}
                            className={`p-2 rounded-lg transition ${audioEnabled
                                ? "bg-purple-500/20 hover:bg-purple-500/30"
                                : "hover:bg-white/10"
                                }`}
                            title={audioEnabled ? "Matikan suara peringatan" : "Hidupkan suara peringatan"}
                        >
                            <svg
                                className={`w-5 h-5 ${audioEnabled ? "text-purple-400" : "text-white/40"}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                {audioEnabled ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5.586 15.536a2 2 0 002.828 0L12 11.95V19a2 2 0 104 0v-7.05l3.586 3.586a2 2 0 002.828 0 2 2 0 000-2.828L8.464 8.464a2 2 0 00-2.828 0L1.05 13.05a2 2 0 000 2.828 2 2 0 002.828 0l1.708-1.708V19a2 2 0 004 0v-5.636zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                    />
                                )}
                            </svg>
                        </button>

                        {!isDashboard && (
                            <Link
                                href="/dashboard"
                                className="text-white/60 hover:text-white transition text-sm ml-2"
                            >
                                ← Kembali ke Dasbor
                            </Link>
                        )}

                        {isDashboard && (
                            <Link
                                href="/admin/urls"
                                className="flex items-center gap-2 text-white/60 hover:text-white transition text-sm ml-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>

                            </Link>
                        )}
                    </div>
                </div>
            </div>
            <AudioAlertManager />
        </nav >
    );
}
