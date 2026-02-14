/**
 * ✅ TAHAP 7: Next.js Instrumentation Hook
 * 
 * File ini dipanggil otomatis oleh Next.js saat aplikasi start (baik dev maupun production).
 * Digunakan untuk validasi environment variables sebelum aplikasi berjalan.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see lib/utils/check-env.ts
 */

export async function register() {
    // Only run on server-side
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Dynamic import to avoid bundling issues
        const { checkEnvironmentOrExit } = await import('./lib/utils/check-env');
        
        // Run validation
        checkEnvironmentOrExit();
    }
}
