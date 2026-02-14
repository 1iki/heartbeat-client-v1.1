import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
}

export function Button({
    className = "",
    variant = "default",
    size = "default",
    children,
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

    let variantStyles = "";
    switch (variant) {
        case "default":
            variantStyles = "bg-status-fresh text-black hover:bg-status-fresh/90 shadow-sm";
            break;
        case "destructive":
            variantStyles = "bg-status-down text-white hover:bg-status-down/90 shadow-sm";
            break;
        case "outline":
            variantStyles = "border border-white/20 bg-transparent hover:bg-white/10 text-white";
            break;
        case "secondary":
            variantStyles = "bg-white/10 text-white hover:bg-white/20";
            break;
        case "ghost":
            variantStyles = "hover:bg-white/10 text-white hover:text-white";
            break;
    }

    let sizeStyles = "";
    switch (size) {
        case "default":
            sizeStyles = "h-9 px-4 py-2";
            break;
        case "sm":
            sizeStyles = "h-8 rounded-md px-3 text-xs";
            break;
        case "lg":
            sizeStyles = "h-10 rounded-md px-8";
            break;
        case "icon":
            sizeStyles = "h-9 w-9";
            break;
    }

    return (
        <button
            className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
