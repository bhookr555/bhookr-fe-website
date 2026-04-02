import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import logger from "@/lib/logger";
import { adminDb } from "@/lib/firebase/admin";
import { updateSubscriptionStatus } from "@/lib/google-sheets";
import { z } from "zod";

const cancelSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  reason: z.string().optional(),
});

/**
 * POST /api/subscription/cancel
 * Cancel an active subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    
    logger.apiRequest("POST", "/api/subscription/cancel", { 
      userId: user.uid,
    });

    // Parse and validate request body
    const body = await request.json();
    const { subscriptionId, reason } = cancelSchema.parse(body);

    console.log('[CANCEL-SUBSCRIPTION] Request:', {
      userId: user.uid,
      subscriptionId,
      reason
    });

    if (!adminDb) {
      throw new Error("Firebase Admin not initialized");
    }

    // Try to find subscription by document ID first
    let subscriptionRef = adminDb.collection("subscriptions").doc(subscriptionId);
    let subscriptionDoc: FirebaseFirestore.DocumentSnapshot = await subscriptionRef.get();

    console.log('[CANCEL-SUBSCRIPTION] Document check (by doc ID):', {
      subscriptionId,
      exists: subscriptionDoc.exists,
    });

    // If not found by document ID, try to find by custom 'id' field (legacy subscriptions)
    if (!subscriptionDoc.exists) {
      console.log('[CANCEL-SUBSCRIPTION] Trying to find by custom id field...');
      const querySnapshot = await adminDb.collection("subscriptions")
        .where("id", "==", subscriptionId)
        .where("userId", "==", user.uid)
        .limit(1)
        .get();
      
      if (!querySnapshot.empty) {
        subscriptionDoc = querySnapshot.docs[0]!;
        subscriptionRef = subscriptionDoc.ref;
        console.log('[CANCEL-SUBSCRIPTION] Found by custom id:', {
          docId: subscriptionDoc.id,
          customId: subscriptionId
        });
      }
    }

    console.log('[CANCEL-SUBSCRIPTION] Final document check:', {
      subscriptionId,
      exists: subscriptionDoc.exists,
      data: subscriptionDoc.exists ? subscriptionDoc.data() : null
    });

    if (!subscriptionDoc.exists) {
      logger.warn("Subscription not found", { subscriptionId, userId: user.uid });
      console.error('[CANCEL-SUBSCRIPTION] Subscription document does not exist:', subscriptionId);
      return NextResponse.json(
        { error: "Subscription not found. The subscription may have been deleted or the ID is incorrect." },
        { status: 404 }
      );
    }

    const subscriptionData = subscriptionDoc.data();

    // Verify ownership
    if (subscriptionData?.userId !== user.uid) {
      logger.security("Unauthorized subscription cancellation attempt", {
        subscriptionId,
        userId: user.uid,
        actualUserId: subscriptionData?.userId,
      });
      return NextResponse.json(
        { error: "Unauthorized to cancel this subscription" },
        { status: 403 }
      );
    }

    // Check if already cancelled
    if (subscriptionData?.status === "cancelled") {
      return NextResponse.json(
        { error: "Subscription is already cancelled" },
        { status: 400 }
      );
    }

    // Update subscription status
    await subscriptionRef.update({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: reason || "User cancelled",
      updatedAt: new Date(),
    });

    logger.info("Subscription cancelled successfully", {
      subscriptionId,
      userId: user.uid,
    });

    // Update Google Sheets asynchronously (don't block response)
    const orderId = subscriptionData?.orderId;
    if (orderId) {
      updateSubscriptionStatus(orderId, 'cancelled', reason)
        .then(() => {
          logger.info("Google Sheets updated with cancellation", { orderId });
        })
        .catch((error) => {
          logger.warn("Failed to update Google Sheets with cancellation", { 
            orderId, 
            error: error instanceof Error ? error.message : String(error)
          });
        });
    } else {
      logger.warn("No orderId found for subscription, skipping Google Sheets update", {
        subscriptionId,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
      subscriptionId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error in subscription cancellation", { 
        errors: error.issues 
      });
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: error.issues 
        },
        { status: 400 }
      );
    }

    logger.error("Failed to cancel subscription", error as Error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
