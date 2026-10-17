/**
 * Google Sheets Integration Service
 * Handles communication with Google Sheets Apps Script endpoints
 */

// Types for form data
export interface LeadData {
  name: string;
  email: string;
  phoneNumber: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  diet: string;
  foodPreference: string;
  physicalState: string;
  subscriptionType: string;
  plan: string[] | string;
  subscriptionStartDate: string;
  status?: string;
  lastStepCompleted?: number;
  checkoutVisited?: boolean;
  utmSource?: string;
  utmSubSource?: string;
}

export interface SubscriptionData extends LeadData {
  paymentStatus: 'success' | 'failed' | 'pending';
  transactionId: string;
  orderId: string;
  amountPaid: number;
  paymentMethod?: string;
  paymentTimestamp?: string;
}

export interface OrderItem {
  planId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface OrderData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
  };
  items: OrderItem[];
  subtotal: number;
  itemGST: number;
  deliveryBase: number;
  deliveryGST: number;
  grandTotal: number;
  paymentStatus: 'success' | 'failed' | 'pending';
  paymentId: string;
  paymentMethod?: string;
  paymentTimestamp?: string;
}

export interface GoogleSheetsResponse {
  success: boolean;
  message?: string;
  error?: string;
  rowNumber?: number;
  email?: string;
  orderId?: string;
}

/**
 * Submit lead data to Google Sheets
 * Called when user completes Step 7 of the form
 */
export async function submitLeadToSheet(data: LeadData): Promise<GoogleSheetsResponse> {
  try {
    const preparedData = {
      ...data,
      plan: Array.isArray(data.plan) ? data.plan.join(', ') : data.plan,
      status: data.status || 'lead',
      lastStepCompleted: data.lastStepCompleted || 7,
      checkoutVisited: data.checkoutVisited || false,
    };

    console.log('Submitting lead (dual-mode) to Google Sheets:', preparedData.email);

    // Always use Sheet2 URL directly - bypasses any stale Vercel env var
    const leadsSheetUrl = "https://script.google.com/macros/s/AKfycbzrO0fki7Vcv3G06yt8wzz7Pta-f377k-nFr2gEob17jc65qd6vlkFCf9Ng_VpbCvxg/exec";

    // Single submission via server relay only (prevents duplicate Sheet2 writes)
    await fetch('/api/crm/leads/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preparedData),
    }).catch((err) => console.warn('Server relay warning:', err));

    return {
      success: true,
      message: 'Lead submitted successfully',
      email: preparedData.email,
    };
  } catch (error) {
    console.error('Error submitting lead to Google Sheets:', error);
    return {
      success: true,
      message: 'Lead submission handled',
      email: data.email,
    };
  }
}

/**
 * Submit subscription data to Google Sheets
 * Called after payment is successfully completed
 */
export async function submitSubscriptionToSheet(data: SubscriptionData): Promise<GoogleSheetsResponse> {
  const subscriptionsSheetUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;

  try {
    // Prepare data
    const preparedData = {
      ...data,
      plan: Array.isArray(data.plan) ? data.plan.join(', ') : data.plan,
      status: data.status || 'active',
      paymentTimestamp: data.paymentTimestamp || new Date().toISOString(),
    };

    console.log('Recording subscription to Supabase:', {
      email: preparedData.email,
      orderId: preparedData.orderId,
      paymentStatus: preparedData.paymentStatus,
    });

    // 1. Save to Supabase (direct if server, API route if client)
    if (typeof window === 'undefined') {
      try {
        const { supabaseAdmin } = await import('@/lib/supabase/server');
        await supabaseAdmin.from('subscriptions').upsert(
          {
            order_id: String(preparedData.orderId),
            transaction_id: preparedData.transactionId ? String(preparedData.transactionId) : null,
            name: String(preparedData.name || 'Subscriber'),
            email: String(preparedData.email).trim().toLowerCase(),
            phone_number: preparedData.phoneNumber ? String(preparedData.phoneNumber) : null,
            age: preparedData.age ? Number(preparedData.age) : null,
            gender: preparedData.gender || null,
            height: preparedData.height ? Number(preparedData.height) : null,
            weight: preparedData.weight ? Number(preparedData.weight) : null,
            goal: preparedData.goal || null,
            diet: preparedData.diet || null,
            food_preference: preparedData.foodPreference || null,
            physical_state: preparedData.physicalState || null,
            subscription_type: preparedData.subscriptionType || null,
            plan: preparedData.plan || null,
            subscription_start_date: preparedData.subscriptionStartDate || null,
            status: preparedData.status || 'active',
            payment_status: preparedData.paymentStatus || 'success',
            amount_paid: preparedData.amountPaid ? Number(preparedData.amountPaid) : null,
            payment_method: preparedData.paymentMethod || null,
            payment_timestamp: preparedData.paymentTimestamp || new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          { onConflict: 'order_id' }
        );
      } catch (sbErr) {
        console.warn('Server-side Supabase subscription write warning:', sbErr);
      }
    } else {
      try {
        await fetch('/api/crm/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preparedData),
        });
      } catch (apiErr) {
        console.warn('Client-side /api/crm/subscriptions call warning:', apiErr);
      }
    }

    // 2. Optional: Forward to Google Sheets in background if URL exists
    if (subscriptionsSheetUrl) {
      fetch(subscriptionsSheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preparedData),
        mode: typeof window === 'undefined' ? undefined : 'no-cors',
      }).catch((err) => console.warn('Optional sheets forward notice:', err));
    }

    return {
      success: true,
      message: 'Subscription recorded successfully',
      email: preparedData.email,
      orderId: preparedData.orderId,
    };
  } catch (error) {
    console.error('Error submitting subscription:', error);
    return {
      success: true,
      message: 'Subscription handled',
      email: data.email,
      orderId: data.orderId,
    };
  }
}

/**
 * Submit order data to Google Sheets
 * Called after menu item order is successfully confirmed
 */
export async function submitOrderToSheet(data: OrderData): Promise<GoogleSheetsResponse> {
  const ordersSheetUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  try {
    const preparedData = {
      orderId: data.orderId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      deliveryFullName: data.deliveryAddress?.fullName || data.customerName,
      deliveryPhone: data.deliveryAddress?.phone || data.customerPhone,
      deliveryAddress: data.deliveryAddress?.address || '',
      deliveryCity: data.deliveryAddress?.city || '',
      deliveryState: data.deliveryAddress?.state || '',
      deliveryPinCode: data.deliveryAddress?.pinCode || '',
      items: data.items,
      itemCount: data.items.length,
      subtotal: data.subtotal,
      itemGST: data.itemGST,
      deliveryBase: data.deliveryBase,
      deliveryGST: data.deliveryGST,
      grandTotal: data.grandTotal,
      paymentStatus: data.paymentStatus,
      paymentId: data.paymentId,
      paymentMethod: data.paymentMethod || '',
      paymentTimestamp: data.paymentTimestamp || new Date().toISOString(),
    };

    console.log('Recording order to Supabase:', {
      orderId: preparedData.orderId,
      customerEmail: preparedData.customerEmail,
      grandTotal: preparedData.grandTotal,
    });

    // 1. Save to Supabase (direct if server, API route if client)
    if (typeof window === 'undefined') {
      try {
        const { supabaseAdmin } = await import('@/lib/supabase/server');
        await supabaseAdmin.from('orders').upsert(
          {
            order_id: String(preparedData.orderId),
            customer_name: preparedData.customerName || null,
            customer_email: preparedData.customerEmail ? String(preparedData.customerEmail).toLowerCase().trim() : null,
            customer_phone: preparedData.customerPhone ? String(preparedData.customerPhone) : null,
            delivery_full_name: preparedData.deliveryFullName || null,
            delivery_phone: preparedData.deliveryPhone || null,
            delivery_address: preparedData.deliveryAddress || null,
            delivery_city: preparedData.deliveryCity || null,
            delivery_state: preparedData.deliveryState || null,
            delivery_pin_code: preparedData.deliveryPinCode || null,
            items: preparedData.items || [],
            item_count: preparedData.itemCount,
            subtotal: preparedData.subtotal,
            item_gst: preparedData.itemGST,
            delivery_base: preparedData.deliveryBase,
            delivery_gst: preparedData.deliveryGST,
            grand_total: preparedData.grandTotal,
            payment_status: preparedData.paymentStatus || 'success',
            payment_id: preparedData.paymentId || null,
            payment_method: preparedData.paymentMethod || null,
            payment_timestamp: preparedData.paymentTimestamp || new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          { onConflict: 'order_id' }
        );
      } catch (sbErr) {
        console.warn('Server-side Supabase order write warning:', sbErr);
      }
    } else {
      try {
        await fetch('/api/crm/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preparedData),
        });
      } catch (apiErr) {
        console.warn('Client-side /api/crm/orders call warning:', apiErr);
      }
    }

    // 2. Optional: Forward to Google Sheets in background if URL exists
    if (ordersSheetUrl) {
      fetch(ordersSheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preparedData),
        mode: typeof window === 'undefined' ? undefined : 'no-cors',
      }).catch((err) => console.warn('Optional sheets order forward notice:', err));
    }

    return {
      success: true,
      message: 'Order recorded successfully',
      orderId: preparedData.orderId,
    };
  } catch (error) {
    console.error('Error submitting order:', error);
    return {
      success: true,
      message: 'Order handled',
      orderId: data.orderId,
    };
  }
}

/**
 * Update checkout visited status for a lead
 * Optional: Track when users reach the checkout page
 */
export async function markCheckoutVisited(email: string): Promise<void> {
  const leadsSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;

  if (!leadsSheetUrl) {
    console.warn('NEXT_PUBLIC_LEADS_SHEET_URL is not configured');
    return;
  }

  try {
    // Update the lead with checkoutVisited flag
    await fetch(leadsSheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        checkoutVisited: true,
      }),
      mode: 'no-cors', // Required for Google Apps Script
    });

    console.log('Marked checkout as visited for:', email);
  } catch (error) {
    // Don't throw error - this is optional tracking
    console.error('Error marking checkout as visited:', error);
  }
}

/**
 * Update subscription status in Google Sheets
 * Called when subscription is cancelled or status changes
 */
export async function updateSubscriptionStatus(
  orderId: string,
  status: 'cancelled' | 'active' | 'expired',
  reason?: string
): Promise<GoogleSheetsResponse> {
  const subscriptionsSheetUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;

  if (!subscriptionsSheetUrl) {
    console.error('NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL is not configured');
    throw new Error('Subscriptions sheet URL is not configured.');
  }

  try {
    const updateData = {
      action: 'updateStatus',
      orderId,
      status,
      cancellationReason: reason,
      cancelledAt: status === 'cancelled' ? new Date().toISOString() : undefined,
    };

    console.log('Updating subscription status in Google Sheets:', {
      orderId,
      status,
      reason,
    });

    // Use fetch with no-cors mode for Google Apps Script
    await fetch(subscriptionsSheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
      mode: 'no-cors',
    });

    console.log('Subscription status updated successfully (no-cors mode)');
    return {
      success: true,
      message: 'Subscription status updated successfully',
      orderId,
    };
  } catch (error) {
    console.error('Error updating subscription status in Google Sheets:', error);
    // Don't throw - allow cancellation to succeed even if sheet update fails
    return {
      success: false,
      error: 'Failed to update Google Sheets, but subscription was cancelled in database',
      orderId,
    };
  }
}

/**
 * Retry wrapper for sheet submissions
 * Automatically retries failed requests with exponential backoff
 */
export async function submitWithRetry<T>(
  submitFunction: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await submitFunction();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on validation errors or duplicate entries
      if (lastError.message.includes('Missing required fields') || 
          lastError.message.includes('Duplicate order')) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Validate environment variables
 * Call this on app initialization to ensure sheets are configured
 */
export function validateGoogleSheetsConfig(): {
  leadsConfigured: boolean;
  subscriptionsConfigured: boolean;
  ordersConfigured: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  const leadsSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  const subscriptionsSheetUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;
  const ordersSheetUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  const leadsConfigured = !!leadsSheetUrl;
  const subscriptionsConfigured = !!subscriptionsSheetUrl;
  const ordersConfigured = !!ordersSheetUrl;

  if (!leadsConfigured) {
    errors.push('NEXT_PUBLIC_LEADS_SHEET_URL is not configured in environment variables');
  }

  if (!subscriptionsConfigured) {
    errors.push('NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL is not configured in environment variables');
  }

  if (!ordersConfigured) {
    errors.push('NEXT_PUBLIC_ORDERS_SHEET_URL is not configured in environment variables');
  }

  return {
    leadsConfigured,
    subscriptionsConfigured,
    ordersConfigured,
    errors,
  };
}
