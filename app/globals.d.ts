// Global type declarations
// Suppress SES lockdown warnings from browser extensions

declare global {
    interface Window {
        // Suppress lockdown warnings
        __LOCKDOWN_WARNINGS_SUPPRESSED__?: boolean;
    }
}

export {};
