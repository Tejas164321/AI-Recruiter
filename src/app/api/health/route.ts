// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

/**
 * Health check endpoint to verify environment configuration
 * GET /api/health
 * Note: AI API keys are user-specific and managed through Profile → API Configuration.
 */
export async function GET() {
    const healthStatus = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        checks: {
            aiApiKeys: {
                note: 'Managed per-user via Profile → API Configuration (not stored in .env)',
                configured: 'user-managed',
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

    // Determine overall status based on Firebase only
    const firebaseChecks = [
        healthStatus.checks.firebase.apiKey,
        healthStatus.checks.firebase.projectId,
        healthStatus.checks.firebase.appId,
    ];

    if (!firebaseChecks.every(Boolean)) {
        healthStatus.status = 'degraded';
    }

    return NextResponse.json(healthStatus);
}
