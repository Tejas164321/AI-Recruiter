// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

/**
 * Health check endpoint to verify environment configuration
 * GET /api/health
 */
export async function GET() {
    const healthStatus = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        checks: {
            googleApiKey: {
                configured: !!process.env.GOOGLE_API_KEY,
                length: process.env.GOOGLE_API_KEY?.length || 0,
            },
            firebase: {
                apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            },
        },
        status: 'ok',
    };

    // Determine overall status
    const allChecks = [
        healthStatus.checks.googleApiKey.configured,
        healthStatus.checks.firebase.apiKey,
        healthStatus.checks.firebase.authDomain,
        healthStatus.checks.firebase.projectId,
        healthStatus.checks.firebase.appId,
    ];

    if (!allChecks.every(Boolean)) {
        healthStatus.status = 'degraded';
    }

    return NextResponse.json(healthStatus);
}
