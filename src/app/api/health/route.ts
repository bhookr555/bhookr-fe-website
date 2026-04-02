import { NextResponse } from "next/server";
import { checkHealth as checkFirebaseHealth } from "@/lib/firebase/connection-pool";
import { getRateLimitStats } from "@/lib/rate-limit";
import { isFirebaseAdminConfigured } from "@/lib/env";

/**
 * GET /api/health
 * System health check endpoint
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check Firebase health
    const firebaseHealth = await checkFirebaseHealth();

    // Get rate limiting stats
    const rateLimitStats = getRateLimitStats();

    // Check environment configuration
    const envHealth = {
      firebaseAdminConfigured: isFirebaseAdminConfigured(),
      nodeEnv: process.env.NODE_ENV,
    };

    // Calculate overall health
    const isHealthy = firebaseHealth.healthy;

    const health = {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      services: {
        firebase: {
          status: firebaseHealth.healthy ? "healthy" : "unhealthy",
          details: firebaseHealth.details,
        },
        rateLimit: {
          status: "healthy",
          activeRecords: rateLimitStats.totalRecords,
        },
        environment: {
          status: envHealth.firebaseAdminConfigured ? "healthy" : "degraded",
          details: envHealth,
        },
      },
      version: process.env.npm_package_version || "unknown",
    };

    return NextResponse.json(health, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}

