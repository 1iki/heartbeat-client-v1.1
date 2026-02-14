import { create } from "zustand";
import { VisualizationMode } from "@/types";

/**
 * UI State Store
 * Manages global UI state (frontend only)
 */

interface UIState {
    // Visualization mode
    visualizationMode: VisualizationMode;
    setVisualizationMode: (mode: VisualizationMode) => void;

    // Side panel
    sidePanelOpen: boolean;
    selectedNodeId: string | null;
    setSelectedNodeId: (nodeId: string | null) => void;
    openSidePanel: (nodeId: string) => void;
    closeSidePanel: () => void;

    // Audio
    audioEnabled: boolean;
    toggleAudio: () => void;

    // Interval toggles
    sheetsSyncEnabled: boolean;
    sheetsSyncInterval: number; // in seconds
    statusCheckEnabled: boolean;
    statusCheckInterval: number; // in seconds
    toggleSheetsSync: () => void;
    toggleStatusCheck: () => void;
    setSheetsSyncInterval: (interval: number) => void;
    setStatusCheckInterval: (interval: number) => void;

    // Loading states
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Initial state
    visualizationMode: "Atom",
    sidePanelOpen: false,
    selectedNodeId: null,
    audioEnabled: true,
    sheetsSyncEnabled: false,
    sheetsSyncInterval: 30, // Default 30s
    statusCheckEnabled: false,
    statusCheckInterval: 5,  // Default 5s
    isLoading: true,

    // Actions
    setVisualizationMode: (mode) => set({ visualizationMode: mode }),

    setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

    openSidePanel: (nodeId) =>
        set({ sidePanelOpen: true, selectedNodeId: nodeId }),

    closeSidePanel: () => set({ sidePanelOpen: false, selectedNodeId: null }),

    toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

    toggleSheetsSync: () => set((state) => ({ sheetsSyncEnabled: !state.sheetsSyncEnabled })),

    toggleStatusCheck: () => set((state) => ({ statusCheckEnabled: !state.statusCheckEnabled })),

    setSheetsSyncInterval: (interval) => set({ sheetsSyncInterval: interval }),

    setStatusCheckInterval: (interval) => set({ statusCheckInterval: interval }),

    setLoading: (loading) => set({ isLoading: loading }),
}));
