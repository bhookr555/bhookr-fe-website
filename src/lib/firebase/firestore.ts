import { adminDb } from "./admin";
import { withConnection } from "./connection-pool";
import { updateSubscriptionStatus as updateGoogleSheetStatus } from "@/lib/google-sheets";

// User operations
// Note: Password management is handled by Firebase Auth, not stored in Firestore
export async function createUser(userData: {
  id: string;
  email: string;
  name: string;
  image?: string;
}): Promise<{ id: string; email: string; name: string; image: string | null; role: string; createdAt: Date; updatedAt: Date }> {
  return withConnection(async () => {
    if (!adminDb) {
      throw new Error("Firebase Admin not initialized");
    }

    const userRef = adminDb.collection("users").doc(userData.id);
    
    const user = {
      email: userData.email,
      name: userData.name,
      image: userData.image || null,
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRef.set(user);

    return { id: userData.id, ...user };
  }, 'createUser');
}

export async function getUserByEmail(email: string): Promise<{ id: string; email: string; name: string; image?: string | null; role?: string; [key: string]: any } | null> {
  return withConnection(async () => {
    if (!adminDb) {
      return null;
    }

    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty || !snapshot.docs[0]) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as { id: string; email: string; name: string; image?: string | null; role?: string; [key: string]: any };
  }, 'getUserByEmail');
}

export async function getUserById(userId: string): Promise<{ id: string; email: string; name: string; image?: string | null; role?: string; [key: string]: any } | null> {
  if (!adminDb) {
    return null;
  }

  const userRef = adminDb.collection("users").doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() } as { id: string; email: string; name: string; image?: string | null; role?: string; [key: string]: any };
}

// Credential verification is handled by Firebase Auth
// This function is deprecated - use Firebase Auth directly
export async function verifyUserCredentials(_email: string, _password: string): Promise<{ id: string; email: string; name: string; image?: string | null; role?: string; [key: string]: any } | null> {
  // Firebase Auth handles authentication
  // This function is kept for backward compatibility but should not be used
  console.warn('verifyUserCredentials is deprecated. Use Firebase Auth signInWithEmailAndPassword instead.');
  return null;
}

// Order operations
export async function createOrder(orderData: any) {
  return withConnection(async () => {
    if (!adminDb) {
      throw new Error("Firebase Admin not initialized");
    }

    const ordersRef = adminDb.collection("orders");
    const orderRef = await ordersRef.add({
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: orderRef.id, ...orderData };
  }, 'createOrder');
}

export async function getOrderById(orderId: string) {
  if (!adminDb) {
    return null;
  }

  const orderRef = adminDb.collection("orders").doc(orderId);
  const doc = await orderRef.get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() };
}

export async function getUserOrders(userId: string) {
  if (!adminDb) {
    return [];
  }

  const ordersRef = adminDb.collection("orders");
  const snapshot = await ordersRef
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Subscription operations
export async function createSubscription(subscriptionData: any) {
  return withConnection(async () => {
    if (!adminDb) {
      throw new Error("Firebase Admin not initialized");
    }

    const subscriptionsRef = adminDb.collection("subscriptions");
    const subscriptionRef = await subscriptionsRef.add({
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: subscriptionRef.id, ...subscriptionData };
  }, 'createSubscription');
}

export async function getSubscriptionById(subscriptionId: string) {
  if (!adminDb) {
    return null;
  }

  const subscriptionRef = adminDb.collection("subscriptions").doc(subscriptionId);
  const doc = await subscriptionRef.get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() };
}

export async function getUserSubscriptions(userId: string) {
  if (!adminDb) {
    return [];
  }

  const subscriptionsRef = adminDb.collection("subscriptions");
  const snapshot = await subscriptionsRef
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  
  // Check for expired subscriptions and update them on-the-fly
  const now = new Date();
  const batch = adminDb.batch();
  const expiredSubscriptions: Array<{ id: string; orderId: string }> = [];

  subscriptions.forEach((subscription, index) => {
    // Only check active subscriptions
    if (subscription.status === 'active' && subscription.endDate) {
      try {
        // Handle Firestore Timestamp
        let endDate: Date;
        if (subscription.endDate.toDate && typeof subscription.endDate.toDate === 'function') {
          endDate = subscription.endDate.toDate();
        } else if (subscription.endDate._seconds !== undefined) {
          endDate = new Date(subscription.endDate._seconds * 1000);
        } else if (subscription.endDate.seconds !== undefined) {
          endDate = new Date(subscription.endDate.seconds * 1000);
        } else {
          endDate = new Date(subscription.endDate);
        }

        // Check if subscription has expired
        if (endDate < now) {
          const subscriptionRef = subscriptionsRef.doc(subscription.id);
          batch.update(subscriptionRef, {
            status: 'expired',
            expiredAt: now,
            updatedAt: now,
            expiredReason: 'Subscription period ended',
          });
          
          // Update the in-memory subscription object
          subscriptions[index].status = 'expired';
          subscriptions[index].expiredAt = now;
          subscriptions[index].updatedAt = now;
          subscriptions[index].expiredReason = 'Subscription period ended';
          
          // Track for Google Sheets update
          if (subscription.orderId) {
            expiredSubscriptions.push({
              id: subscription.id,
              orderId: subscription.orderId,
            });
          }
        }
      } catch (error) {
        console.error(`Error checking expiry for subscription ${subscription.id}:`, error);
      }
    }
  });

  // Commit the batch update if there are expired subscriptions
  if (expiredSubscriptions.length > 0) {
    try {
      await batch.commit();
      console.log('[getUserSubscriptions] Updated expired subscriptions in Firestore');
      
      // Update Google Sheets for each expired subscription (non-blocking)
      expiredSubscriptions.forEach(({ id, orderId }) => {
        updateGoogleSheetStatus(orderId, 'expired', 'Subscription period ended')
          .then(() => {
            console.log(`[getUserSubscriptions] Updated Google Sheets for subscription ${id}`);
          })
          .catch((error) => {
            console.error(`[getUserSubscriptions] Failed to update Google Sheets for subscription ${id}:`, error);
            // Don't throw - Google Sheets sync is non-critical
          });
      });
    } catch (error) {
      console.error('[getUserSubscriptions] Failed to update expired subscriptions:', error);
    }
  }

  return subscriptions;
}
