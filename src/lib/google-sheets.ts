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
  const leadsSheetUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;

  if (!leadsSheetUrl) {
    console.error('NEXT_PUBLIC_LEADS_SHEET_URL is not configured');
    throw new Error('Leads sheet URL is not configured. Please add it to your environment variables.');
  }

  try {
    // Prepare data - convert arrays to comma-separated strings
    const preparedData = {
      ...data,
      plan: Array.isArray(data.plan) ? data.plan.join(', ') : data.plan,
      status: data.status || 'lead',
      lastStepCompleted: data.lastStepCompleted || 7,
      checkoutVisited: data.checkoutVisited || false,
    };

    console.log('Submitting lead to Google Sheets:', preparedData.email);

    // Add timeout to prevent hanging (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Use fetch with no-cors mode for Google Apps Script
      await fetch(leadsSheetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preparedData),
        mode: 'no-cors', // Required for Google Apps Script
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Google Sheets service took too long to respond');
      }
      throw fetchError;
    }

    // With no-cors mode, we can't read the response, so we assume success
    console.log('Lead submitted successfully (no-cors mode)');
    return {
      success: true,
      message: 'Lead submitted successfully',
      email: preparedData.email,
    };
  } catch (error) {
    console.error('Error submitting lead to Google Sheets:', error);
    throw new Error('Failed to submit lead. Please try again.');
  }
}

/**
 * Submit subscription data to Google Sheets
 * Called after payment is successfully completed
 */
export async function submitSubscriptionToSheet(data: SubscriptionData): Promise<GoogleSheetsResponse> {
  const subscriptionsSheetUrl = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL;

  if (!subscriptionsSheetUrl) {
    console.error('NEXT_PUBLIC_SUBSCRIPTIONS_SHEET_URL is not configured');
    throw new Error('Subscriptions sheet URL is not configured. Please add it to your environment variables.');
  }

  try {
    // Prepare data - convert arrays to comma-separated strings
    const preparedData = {
      ...data,
      plan: Array.isArray(data.plan) ? data.plan.join(', ') : data.plan,
      status: data.status || 'active',
      paymentTimestamp: data.paymentTimestamp || new Date().toISOString(),
    };

    console.log('Submitting subscription to Google Sheets:', {
      email: preparedData.email,
      orderId: preparedData.orderId,
      paymentStatus: preparedData.paymentStatus,
    });

    // Add timeout to prevent hanging (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Use fetch with no-cors mode for Google Apps Script
      await fetch(subscriptionsSheetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preparedData),
        mode: 'no-cors', // Required for Google Apps Script
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Google Sheets service took too long to respond');
      }
      throw fetchError;
    }

    // With no-cors mode, we can't read the response, so we assume success
    console.log('Subscription submitted successfully (no-cors mode)');
    return {
      success: true,
      message: 'Subscription submitted successfully',
      email: preparedData.email,
      orderId: preparedData.orderId,
    };
  } catch (error) {
    console.error('Error submitting subscription to Google Sheets:', error);
    throw new Error('Failed to submit subscription. Please try again.');
  }
}

/**
 * Submit order data to Google Sheets
 * Called after menu item order is successfully confirmed
 */
export async function submitOrderToSheet(data: OrderData): Promise<GoogleSheetsResponse> {
  const ordersSheetUrl = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  if (!ordersSheetUrl) {
    console.error('NEXT_PUBLIC_ORDERS_SHEET_URL is not configured');
    throw new Error('Orders sheet URL is not configured. Please add it to your environment variables.');
  }

  try {
    // Prepare data for the sheet
    const preparedData = {
      orderId: data.orderId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      deliveryFullName: data.deliveryAddress.fullName,
      deliveryPhone: data.deliveryAddress.phone,
      deliveryAddress: data.deliveryAddress.address,
      deliveryCity: data.deliveryAddress.city,
      deliveryState: data.deliveryAddress.state,
      deliveryPinCode: data.deliveryAddress.pinCode,
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

    console.log('Submitting order to Google Sheets:', {
      orderId: preparedData.orderId,
      customerEmail: preparedData.customerEmail,
      grandTotal: preparedData.grandTotal,
    });

    // Add timeout to prevent hanging (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Use fetch with no-cors mode for Google Apps Script
      await fetch(ordersSheetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preparedData),
        mode: 'no-cors', // Required for Google Apps Script
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Google Sheets service took too long to respond');
      }
      throw fetchError;
    }

    // With no-cors mode, we can't read the response, so we assume success
    console.log('Order submitted to Google Sheets successfully (no-cors mode)');
    return {
      success: true,
      message: 'Order submitted successfully',
      orderId: preparedData.orderId,
    };
  } catch (error) {
    console.error('Error submitting order to Google Sheets:', error);
    throw new Error('Failed to submit order to Google Sheets. Please try again.');
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
