import React from "react";

/**
 * LoadingSpinner Component
 * 
 * Elegant loading spinner with animated ring and gradient
 * Used as fallback for lazy-loaded heavy components (Three.js, D3.js)
 * 
 * Features:
 * - Smooth spin animation (1s duration)
 * - Gradient border for visual appeal
 * - Centered overlay with semi-transparent backdrop
 * - Accessible with proper ARIA labels
 * 
 * Usage:
 * <Suspense fallback={<LoadingSpinner />}>
 *   <HeavyComponent />
 * </Suspense>
 * 
 * @example
 * // With custom message
 * <LoadingSpinner message="Loading visualization..." />
 */

interface LoadingSpinnerProps {
    /**
     * Optional loading message displayed below spinner
     * @default "Loading..."
     */
    message?: string;

    /**
     * Spinner size
     * @default "md"
     */
    size?: "sm" | "md" | "lg" | "xl";

    /**
     * Whether to show full-page overlay
     * @default true
     */
    overlay?: boolean;
}

const sizeClasses = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-3",
    lg: "w-16 h-16 border-4",
    xl: "w-24 h-24 border-[5px]",
};

export function LoadingSpinner({
    message = "Loading...",
    size = "md",
    overlay = true,
}: LoadingSpinnerProps) {
    const spinnerContent = (
        <div
            className="flex flex-col items-center justify-center gap-4"
            role="status"
            aria-live="polite"
            aria-label={message}
        >
            {/* Animated spinner ring with gradient */}
            <div className="relative">
                {/* Outer glow effect */}
                <div
                    className={`
                        ${sizeClasses[size]}
                        rounded-full
                        bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500
                        opacity-20
                        blur-md
                        animate-spin
                    `}
                />

                {/* Main spinner */}
                <div
                    className={`
                        absolute inset-0
                        ${sizeClasses[size]}
                        rounded-full
                        border-transparent
                        border-t-blue-500
                        border-r-purple-500
                        animate-spin
                    `}
                    style={{
                        animationDuration: "1s",
                    }}
                />
            </div>

            {/* Loading message */}
            {message && (
                <p className="text-sm font-medium text-gray-300 animate-pulse">
                    {message}
                </p>
            )}

            {/* Screen reader text */}
            <span className="sr-only">{message}</span>
        </div>
    );

    // Full-page overlay mode
    if (overlay) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                {spinnerContent}
            </div>
        );
    }

    // Inline mode
    return (
        <div className="flex items-center justify-center min-h-[300px] w-full">
            {spinnerContent}
        </div>
    );
}

/**
 * Compact inline spinner without overlay
 * Useful for loading states within cards or sections
 */
export function LoadingSpinnerInline({
    message,
    size = "sm",
}: Omit<LoadingSpinnerProps, "overlay">) {
    return <LoadingSpinner message={message} size={size} overlay={false} />;
}

/**
 * Fullscreen loading with larger spinner
 * Ideal for page-level lazy loading
 */
export function LoadingSpinnerFullscreen({
    message = "Loading visualization...",
}: Pick<LoadingSpinnerProps, "message">) {
    return <LoadingSpinner message={message} size="xl" overlay={true} />;
}
