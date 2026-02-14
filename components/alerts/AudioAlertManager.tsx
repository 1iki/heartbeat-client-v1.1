"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUIStore } from "@/lib/stores/uiStore";
import { useNodeData } from "@/lib/hooks/useNodeData";
import { NodeData } from "@/types";

const ALERT_SOUND_URI = "/sound/sound-warning.mp3";

export function AudioAlertManager() {
    const { audioEnabled } = useUIStore();
    const { nodes } = useNodeData();

    // History: NodeID -> Array of timestamps when error was detected
    const [errorHistory, setErrorHistory] = useState<Record<string, number[]>>({});
    const [audioLoaded, setAudioLoaded] = useState(false);

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);

    // Constants
    const TIME_WINDOW = 3 * 60 * 1000; // 3 minutes
    const ERROR_THRESHOLD = 3; // 3x scans

    // Initialize Audio Object - LAZY LOADING (only when needed)
    useEffect(() => {
        // Don't initialize audio until it's actually needed
        // This prevents "Invalid URI" errors on page load
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
                audioRef.current = null;
            }
        };
    }, []);

    // Initialize audio on first use
    const initializeAudio = () => {
        if (audioRef.current || typeof window === 'undefined') return;

        try {
            const audio = new Audio();
            audio.preload = 'none'; // Don't preload - load only when playing
            audio.loop = true;
            
            // Handle successful load
            audio.addEventListener('canplaythrough', () => {
                setAudioLoaded(true);
            }, { once: true });
            
            // Handle audio load errors silently
            audio.addEventListener('error', () => {
                setAudioLoaded(false);
            }, { once: true });
            
            // Set src
            audio.src = ALERT_SOUND_URI;
            audioRef.current = audio;
        } catch (error) {
            setAudioLoaded(false);
        }
    };

    // Function to check if node has server-side error
    const isServerSideError = (node: NodeData) => {
        // "DOWN" status is general, but let's be specific if possible.
        // If httpStatus is available, check 5xx.
        if (node.httpStatus && node.httpStatus >= 500) return true;

        // Fallback: If status is DOWN and we don't have httpStatus (e.g. timeout), count it.
        if (node.status === "DOWN") {
            // Ignore 4xx (Client errors)
            if (node.httpStatus && node.httpStatus >= 400 && node.httpStatus < 500) {
                return false;
            }
            return true;
        }
        return false;
    };

    const startAlarm = useCallback(() => {
        // Initialize audio on first use (lazy loading)
        if (!audioRef.current) {
            initializeAudio();
        }
        
        if (isPlayingRef.current || !audioEnabled || !audioRef.current) return;

        try {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        isPlayingRef.current = true;
                    })
                    .catch(() => {
                        // Silent fail - user interaction may be required
                        isPlayingRef.current = false;
                    });
            }
        } catch (e) {
            // Silent fail
            isPlayingRef.current = false;
        }
    }, [audioEnabled]);

    const stopAlarm = useCallback(() => {
        if (!isPlayingRef.current || !audioRef.current) return;

        try {
            audioRef.current.pause();
            audioRef.current.currentTime = 0; // Reset to start
            isPlayingRef.current = false;
        } catch (e) {
            // Silent fail
            isPlayingRef.current = false;
        }
    }, []);

    // Main Effect: Watch audioEnabled
    useEffect(() => {
        if (!audioEnabled) {
            stopAlarm();
        }
    }, [audioEnabled, stopAlarm]);

    // Main Logic: Watch Nodes & Update History
    useEffect(() => {
        const now = Date.now();
        const currentErrorNodes = nodes.filter(isServerSideError);

        setErrorHistory(prevHistory => {
            const newHistory = { ...prevHistory };
            let hasChanges = false;

            // Add timestamps
            currentErrorNodes.forEach(node => {
                const history = newHistory[node.id] || [];
                const lastTime = history[history.length - 1];
                if (!lastTime || (now - lastTime > 2000)) {
                    newHistory[node.id] = [...history, now];
                    hasChanges = true;
                }
            });

            // Prune old timestamps
            Object.keys(newHistory).forEach(nodeId => {
                const filtered = newHistory[nodeId].filter(t => now - t <= TIME_WINDOW);
                if (filtered.length !== newHistory[nodeId].length) {
                    hasChanges = true;
                    newHistory[nodeId] = filtered;
                }
                if (newHistory[nodeId].length === 0) {
                    delete newHistory[nodeId];
                    hasChanges = true;
                }
            });

            // Only return new object if there are actual changes
            return hasChanges ? newHistory : prevHistory;
        });

    }, [nodes]);

    // Check Trigger Condition
    useEffect(() => {
        if (!audioEnabled) {
            stopAlarm();
            return;
        }

        // Check if ANY node meets the threshold
        const shouldTrigger = Object.values(errorHistory).some(timestamps => timestamps.length >= ERROR_THRESHOLD);

        if (shouldTrigger) {
            startAlarm();
        } else {
            stopAlarm();
        }
    }, [errorHistory, audioEnabled, startAlarm, stopAlarm]);

    return null;
}
