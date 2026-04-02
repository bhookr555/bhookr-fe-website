import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import logger from "@/lib/logger";

/**
 * GET /api/cron/cleanup-pending
 * Cleanup stale pending subscriptions (older than 2 minutes)
 * 
 * This should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
 * Schedule: Every 5 minutes recommended
 * 
 * Security: Add authorization header check in production
 */
export async function GET(request: NextRequest) {
  try {
    // Production security: Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dev-secret-change-in-production";
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job attempt');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!adminDb) {
      logger.error('Firebase Admin not initialized for cron job');
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 }
      );
    }

    // Calculate cutoff time (2 minutes ago)
    const PENDING_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes
    const cutoffDate = new Date(Date.now() - PENDING_EXPIRY_TIME);

    logger.info('[CRON] Starting cleanup of stale pending subscriptions', {
      cutoffDate: cutoffDate.toISOString()
    });

    // Find all pending subscriptions older than 30 minutes
    const subscriptionsRef = adminDb.collection("subscriptions");
    const stalePendingSnapshot = await subscriptionsRef
      .where("status", "==", "pending")
      .where("createdAt", "<", cutoffDate)
      .get();

    if (stalePendingSnapshot.empty) {
      logger.info('[CRON] No stale pending subscriptions found');
      return NextResponse.json({
        success: true,
        message: "No stale pending subscriptions to cleanup",
        cleaned: 0,
      });
    }

    // Batch update to mark as expired
    const batch = adminDb.batch();
    const cleanedIds: string[] = [];

    stalePendingSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      batch.update(doc.ref, {
        status: "expired",
        expiredAt: new Date(),
        updatedAt: new Date(),
        expiredReason: "Payment not completed within 2 minutes",
      });
      
      cleanedIds.push(doc.id);
      
      logger.info('[CRON] Marking subscription as expired', {
        subscriptionId: doc.id,
        userId: data.userId,
        planName: data.planName,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || 'unknown',
      });
    });

    // Commit the batch
    await batch.commit();

    logger.info('[CRON] Successfully cleaned up stale pending subscriptions', {
      count: cleanedIds.length,
      ids: cleanedIds,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${cleanedIds.length} stale pending subscriptions`,
      cleaned: cleanedIds.length,
      subscriptionIds: cleanedIds,
    });
  } catch (error) {
    logger.error(
      '[CRON] Failed to cleanup stale pending subscriptions',
      error instanceof Error ? error : new Error(String(error))
    );
    
    return NextResponse.json(
      { 
        error: "Failed to cleanup stale pending subscriptions",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger (testing/admin)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
