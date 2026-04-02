import { NextResponse } from "next/server";
import { getUserSubscriptions } from "@/lib/firebase/firestore";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const subscriptions = await getUserSubscriptions(userId);
    
    logger.info('[MY-SUBSCRIPTIONS-API] Fetched subscriptions', {
      userId,
      count: subscriptions.length,
    });

    // Production-ready: Filter out stale pending subscriptions (>2 minutes)
    const PENDING_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();
    
    const filteredSubscriptions = subscriptions.filter((sub: any) => {
      // Keep non-pending subscriptions
      if (sub.status !== 'pending') {
        return true;
      }
      
      // For pending subscriptions, check age
      try {
        const createdAt = sub.createdAt?.toDate ? sub.createdAt.toDate() : new Date(sub.createdAt);
        const age = now - createdAt.getTime();
        const isStale = age > PENDING_EXPIRY_TIME;
        
        if (isStale) {
          logger.info('[MY-SUBSCRIPTIONS-API] Filtering stale pending subscription', {
            subscriptionId: sub.id,
            ageMinutes: Math.round(age / 60000)
          });
          return false;
        }
        return true;
      } catch (e) {
        logger.warn('[MY-SUBSCRIPTIONS-API] Error parsing subscription date', {
          subscriptionId: sub.id,
          error: e
        });
        // If date parsing fails for pending, assume it's old and filter it
        return false;
      }
    });

    logger.info('[MY-SUBSCRIPTIONS-API] Returning filtered subscriptions', {
      userId,
      original: subscriptions.length,
      filtered: filteredSubscriptions.length,
    });

    return NextResponse.json({
      success: true,
      subscriptions: filteredSubscriptions,
    });
  } catch (error) {
    logger.error('[MY-SUBSCRIPTIONS-API] Error fetching subscriptions', 
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

