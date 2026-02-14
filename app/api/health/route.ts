/**
 * Health Check API Route
 * Simple endpoint untuk monitoring deployment status
 */

import { NextResponse } from 'next/server';

export async function GET() {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0',
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
        memory: {
            used: process.memoryUsage().heapUsed / 1024 / 1024,
            total: process.memoryUsage().heapTotal / 1024 / 1024,
        },
        checks: {
            mongodb: !!process.env.MONGODB_URI,
            nextauth: !!process.env.NEXTAUTH_SECRET,
            googleSheets: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_API_KEY),
        }
    };

    return NextResponse.json(health, { status: 200 });
}
