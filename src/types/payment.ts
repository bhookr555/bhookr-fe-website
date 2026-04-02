/**
 * Payment Types for Razorpay Integration
 */

export type PaymentGateway = 'RAZORPAY';

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'EMI' | 'CARDLESS_EMI' | 'PAYLATER';

/**
 * Order stored in Firestore
 */
export interface PaymentOrder {
  orderId: string; // UUID
  userId: string; // Firebase User ID
  
  // Order details
  orderType?: 'menu' | 'subscription';
  amount: number; // in INR (not paise)
  currency: 'INR';
  status: OrderStatus;
  gateway: PaymentGateway;
  
  // Cart items
  items: Array<{
    planId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  
  // Customer details
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // Delivery address
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
  };
  
  // Pricing breakdown (for menu items)
  itemAmount?: number; // Subtotal of items (excluding GST)
  itemGST?: number; // 5% GST on food items
  deliveryBase?: number; // Base delivery charge (₹99 for menu items)
  deliveryGST?: number; // 18% GST on delivery
  deliveryCharges?: number; // Total delivery (base + GST)
  grandTotal?: number; // Total amount (same as amount field)
  
  // Subscription pricing breakdown
  subscriptionAmount?: number; // Plan amount (excluding GST)
  gstAmount?: number; // GST on subscription
  startDate?: string; // ISO date string
  duration?: string; // e.g., "1 Month"
  
  // Razorpay specific data
  razorpayData?: {
    orderId?: string; // Razorpay order ID
    paymentId?: string; // Razorpay payment ID (after payment)
    signature?: string; // Payment signature
    method?: string; // Payment method used
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date; // When payment was confirmed
  expiresAt?: Date; // Order expiry time
}

/**
 * Payment transaction stored in Firestore
 */
export interface PaymentTransaction {
  paymentId: string; // Razorpay payment ID
  orderId: string; // Links to orders collection
  userId: string;
  
  // Payment details
  amount: number; // in INR
  currency: 'INR';
  status: PaymentStatus;
  gateway: PaymentGateway;
  method?: string;
  
  // Razorpay response data
  razorpayData?: {
    orderId?: string; // Razorpay order ID
    paymentId?: string; // Razorpay payment ID
    signature?: string; // Payment signature
    status?: string; // Payment status from Razorpay
    method?: string; // Payment method
    email?: string; // Customer email
    contact?: string; // Customer contact
    fee?: number; // Transaction fee
    tax?: number; // Tax amount
    errorCode?: string; // Error code if failed
    errorDescription?: string; // Error description if failed
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date; // When status was last verified
}

/**
 * Request to create payment link
 */
export interface CreatePaymentLinkRequest {
  orderId: string;
  amount: number; // in INR
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    planId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
  };
}

/**
 * Response from creating payment link
 */
export interface CreatePaymentLinkResponse {
  success: boolean;
  orderId: string;
  paymentUrl: string;
  expiresAt: string; // ISO date string
  message?: string;
}

/**
 * Request to verify payment
 */
export interface VerifyPaymentRequest {
  orderId: string;
}

/**
 * Response from verifying payment
 */
export interface VerifyPaymentResponse {
  success: boolean;
  orderId: string;
  status: OrderStatus;
  amount: number;
  transactionId?: string;
  paymentMethod?: PaymentMethod;
  paidAt?: string; // ISO date string
  message?: string;
}



/**
 * Database collections
 */
export const COLLECTIONS = {
  USERS: 'users',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
} as const;

/**
 * Payment link expiry duration (in minutes)
 */
export const PAYMENT_LINK_EXPIRY_MINUTES = 30;

/**
 * Order expiry duration (in minutes)
 */
export const ORDER_EXPIRY_MINUTES = 60;
