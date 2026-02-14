/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
    // Production optimizations
    poweredByHeader: false,
    compress: true,
    
    // Image optimization
    images: {
        domains: [],
        formats: ['image/avif', 'image/webp'],
    },
    
    experimental: {
        serverActions: {
            allowedOrigins: ['localhost:3000'],
        },
        // ✅ TAHAP 7: Enable instrumentation hook for env validation
        instrumentationHook: true,
    },
    
    // Suppress SES lockdown warnings from browser extensions
    reactStrictMode: true,
    
    webpack: (config, { isServer }) => {
        config.watchOptions = {
            poll: 1000,
            aggregateTimeout: 300,
            ignored: /node_modules|\.git|\.next|C:\\pagefile\.sys/,
        }
        
        // Ignore SES/lockdown related modules if they exist
        if (!isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                // Prevent client-side bundling of unnecessary modules
            }
        }
        
        return config
    },
    
    // Environment variable validation
    env: {
        NEXT_PUBLIC_APP_VERSION: '2.0.0',
    },
}

module.exports = nextConfig
