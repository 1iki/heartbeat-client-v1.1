// Suppress SES Lockdown warnings from browser extensions
// This runs before React hydration
if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    const originalError = console.error;
    
    // Filter out SES lockdown warnings
    console.warn = function(...args) {
        const message = args[0]?.toString() || '';
        
        // Suppress SES/lockdown related warnings
        if (
            message.includes('Removing unpermitted intrinsics') ||
            message.includes('Removing intrinsics') ||
            message.includes('lockdown-install') ||
            message.includes('MapPrototype') ||
            message.includes('WeakMapPrototype') ||
            message.includes('DatePrototype') ||
            message.includes('toTemporalInstant') ||
            message.includes('getOrInsert') ||
            // Suppress Next.js auto-scroll warnings for fixed/sticky elements
            message.includes('Skipping auto-scroll behavior') ||
            message.includes('position: sticky') ||
            message.includes('position: fixed') ||
            // Suppress audio load warnings (handled gracefully in code)
            message.includes('Audio failed to load')
        ) {
            return;
        }
        
        originalWarn.apply(console, args);
    };
    
    console.error = function(...args) {
        const message = args[0]?.toString() || '';
        
        // Suppress SES/lockdown related errors
        if (
            message.includes('Removing unpermitted intrinsics') ||
            message.includes('Removing intrinsics') ||
            message.includes('lockdown-install')
        ) {
            return;
        }
        
        originalError.apply(console, args);
    };
}

export {};
