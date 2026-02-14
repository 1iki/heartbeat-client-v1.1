/**
 * Error Boundary Component
 * Catches React errors (including Three.js/WebGL errors) and displays fallback UI
 * 
 * ✅ TAHAP 2 FIX: Prevent blank screen on rendering errors
 */

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

export class ThreeJSErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error details for debugging
        console.error('🔥 ThreeJS/WebGL Error Caught:', error);
        console.error('Error Info:', errorInfo);
        
        // You can also log to an error reporting service here
        // Example: Sentry.captureException(error);
        
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI provided by parent
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="canvas-container flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
                    <div className="glass p-8 rounded-lg max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-status-down/20 flex items-center justify-center">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <h2 className="text-xl font-bold text-status-down">
                                Visualisasi Error
                            </h2>
                        </div>
                        
                        <p className="text-white/80 mb-4">
                            Terjadi kesalahan saat merender visualisasi 3D. 
                            Ini mungkin disebabkan oleh:
                        </p>
                        
                        <ul className="list-disc list-inside text-white/70 text-sm space-y-2 mb-6">
                            <li>Browser tidak mendukung WebGL</li>
                            <li>GPU driver perlu diupdate</li>
                            <li>Memory tidak mencukupi</li>
                            <li>Konflik ekstensi browser</li>
                        </ul>

                        {/* Show error details in development */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
                                <p className="text-red-400 text-xs font-mono mb-2">
                                    <strong>Error:</strong> {this.state.error.message}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="text-red-400/70 text-[10px] font-mono">
                                        <summary className="cursor-pointer hover:text-red-400">
                                            Stack Trace
                                        </summary>
                                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button 
                                onClick={this.handleReset}
                                className="flex-1 px-4 py-2 bg-status-fresh text-white rounded-lg hover:bg-status-fresh/80 transition-colors font-medium"
                            >
                                🔄 Coba Lagi
                            </button>
                            <button 
                                onClick={() => window.location.href = '/dashboard'}
                                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
                            >
                                📊 Dashboard
                            </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-white/50 text-xs text-center">
                                💡 <strong>Tip:</strong> Coba refresh browser atau gunakan mode{' '}
                                <a href="?mode=alerts" className="text-status-fresh hover:underline">
                                    Alerts View
                                </a>
                                {' '}sebagai alternatif
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Generic Error Boundary for other parts of the app
 */
export class GenericErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('⚠️ React Error Caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 font-medium">
                        ⚠️ Something went wrong. Please try again.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
