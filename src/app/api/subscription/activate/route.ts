import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/api-auth";
import logger from "@/lib/logger";

/**
 * POST /api/subscription/activate
 * Activate a pending subscription after successful payment
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await requireAuth(request);
    
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      logger.error('Firebase Admin not initialized');
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Find subscription by orderId
    const subscriptionsRef = adminDb.collection("subscriptions");
    const snapshot = await subscriptionsRef
      .where("orderId", "==", orderId)
      .where("userId", "==", user.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.warn('Subscription not found for order', { orderId, userId: user.uid });
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscriptionDoc = snapshot.docs[0];
    if (!subscriptionDoc) {
      logger.warn('Subscription document is undefined', { orderId, userId: user.uid });
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }
    
    const subscriptionData = subscriptionDoc.data();

    // Check if already active
    if (subscriptionData.status === 'active') {
      logger.info('Subscription already active', { 
        subscriptionId: subscriptionDoc.id, 
        orderId 
      });
      return NextResponse.json({
        success: true,
        message: "Subscription is already active",
        subscription: { id: subscriptionDoc.id, ...subscriptionData },
      });
    }

    // Activate the subscription
    await subscriptionDoc.ref.update({
      status: "active",
      activatedAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('Subscription activated successfully', {
      subscriptionId: subscriptionDoc.id,
      orderId,
      userId: user.uid,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription activated successfully",
      subscription: {
        id: subscriptionDoc.id,
        ...subscriptionData,
        status: "active",
      },
    });
  } catch (error) {
    logger.error(
      "Failed to activate subscription",
      error instanceof Error ? error : new Error(String(error))
    );
    
    return NextResponse.json(
      { error: "Failed to activate subscription" },
      { status: 500 }
    );
  }
}
