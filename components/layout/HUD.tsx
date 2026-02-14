"use client";

import React, { useEffect, useState } from "react";
import { useNodeData } from "@/lib/hooks/useNodeData";

/**
 * HUD (Heads-Up Display) Component
 * Status ticker and system information overlay
 * FRONTEND ONLY
 */

export function HUD() {
    const { nodes } = useNodeData();
    const [tickerText, setTickerText] = useState("");

    useEffect(() => {
        if (nodes.length === 0) {
            setTickerText("Belum ada node yang dikonfigurasi");
            return;
        }

        const statusCounts = {
            STABLE: nodes.filter((n: any) => n.status === "STABLE").length,
            FRESH: nodes.filter((n: any) => n.status === "FRESH").length,
            WARNING: nodes.filter((n: any) => n.status === "WARNING").length,
            DOWN: nodes.filter((n: any) => n.status === "DOWN").length,
        };

        const criticalNodes = nodes
            .filter((n: any) => n.status === "DOWN")
            .map((n: any) => n.name);

        let text = `Total: ${nodes.length} | `;
        text += `Stabil: ${statusCounts.STABLE} | `;
        text += `Baru: ${statusCounts.FRESH} | `;
        text += `Peringatan: ${statusCounts.WARNING} | `;
        text += `Mati: ${statusCounts.DOWN}`;

        if (criticalNodes.length > 0) {
            text += ` | KRITIS: ${criticalNodes.join(", ")}`;
        }

        setTickerText(text);
    }, [nodes]);

    return (
        <div className="fixed top-16 left-0 right-0 z-40 pointer-events-none">
            <div className="glass border-b border-white/5 py-2 px-4 overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="text-xs font-medium text-white/60">STATUS</div>
                    <div className="flex-1 overflow-hidden">
                        <div className="ticker-text text-sm text-white/80 whitespace-nowrap">
                            {/* Duplicate text for seamless loop */}
                            {tickerText} &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; {tickerText}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .ticker-text {
          animation: ticker 30s linear infinite;
        }

        @keyframes ticker {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
        </div>
    );
}
