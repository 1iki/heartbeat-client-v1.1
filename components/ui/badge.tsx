import React from "react";
import { NodeStatus } from "@/types";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "outline" | "destructive";
    status?: NodeStatus; // Quick helper for our specific app
}

export function Badge({
    className = "",
    variant = "default",
    status,
    children,
    ...props
}: BadgeProps) {
    const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    let variantStyles = "";

    // Auto-detect style from status if provided
    if (status) {
        switch (status) {
            case "STABLE":
                variantStyles = "border-status-stable/30 bg-status-stable/20 text-status-stable";
                break;
            case "FRESH":
                variantStyles = "border-status-fresh/30 bg-status-fresh/20 text-status-fresh";
                break;
            case "WARNING":
                variantStyles = "border-status-warning/30 bg-status-warning/20 text-status-warning";
                break;
            case "DOWN":
                variantStyles = "border-status-down/30 bg-status-down/20 text-status-down";
                break;
        }
    } else {
        switch (variant) {
            case "default":
                variantStyles = "border-transparent bg-status-fresh text-black hover:bg-status-fresh/80";
                break;
            case "secondary":
                variantStyles = "border-transparent bg-white/10 text-white hover:bg-white/20";
                break;
            case "destructive":
                variantStyles = "border-transparent bg-status-down text-white hover:bg-status-down/80";
                break;
            case "outline":
                variantStyles = "text-white border-white/20";
                break;
        }
    }

    return (
        <div className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
            {children}
        </div>
    );
}
