import { useEffect, useState } from "react";
import { useUIStore } from "@/lib/stores/uiStore";

/**
 * Custom hook to manage Google Sheets sync interval
 * Automatically syncs data from Google Sheets at regular intervals when enabled
 */
export function useSheetsSyncInterval() {
    const { sheetsSyncEnabled, sheetsSyncInterval } = useUIStore();
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);

    useEffect(() => {
        if (!sheetsSyncEnabled) {
            return;
        }

        // Initial sync on enable
        performSync();

        // Set up interval
        const intervalId = setInterval(() => {
            performSync();
        }, sheetsSyncInterval * 1000);

        // Cleanup on unmount or when disabled
        return () => {
            clearInterval(intervalId);
        };
    }, [sheetsSyncEnabled, sheetsSyncInterval, isSyncing]);

    const performSync = async () => {
        if (isSyncing) {
            console.log("Sync already in progress, skipping...");
            return;
        }

        // Stop syncing after 5 consecutive failures to prevent infinite error loops
        if (consecutiveFailures >= 5) {
            console.error("❌ Sync disabled after 5 consecutive failures. Please check configuration.");
            return;
        }

        setIsSyncing(true);
        setSyncError(null);

        try {
            console.log("🔄 Starting Google Sheets sync...");

            const response = await fetch("/api/google-sheets/sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ deleteOrphaned: false }), // Don't delete existing URLs
            });

            const data = await response.json();

            if (data.success) {
                setLastSync(new Date());
                setConsecutiveFailures(0); // Reset on success
                console.log("✅ Sync completed:", data.data);

                // Show notification if there were changes
                if (data.data.added > 0 || data.data.deleted > 0) {
                    console.log(`📊 Sync Summary: +${data.data.added} added, -${data.data.deleted} deleted`);
                }
            } else {
                setConsecutiveFailures(prev => prev + 1);
                setSyncError(data.error || "Sync failed");
                console.error("❌ Sync failed:", data.message);
            }
        } catch (error: any) {
            setConsecutiveFailures(prev => prev + 1);
            setSyncError(error.message);
            console.error("❌ Sync error:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        isSyncing,
        lastSync,
        syncError,
        performSync, // Allow manual sync trigger
    };
}
