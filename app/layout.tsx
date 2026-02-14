import type { Metadata } from "next";
import "./globals.css";
import "@/lib/utils/suppress-warnings";

export const metadata: Metadata = {
    title: "Visual Monitoring Platform",
    description: "Particle-based real-time service monitoring system",
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning className="antialiased">
                {children}
            </body>
        </html>
    );
}
