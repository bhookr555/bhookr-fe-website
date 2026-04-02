export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface MealPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: "daily" | "weekly" | "monthly" | "one-time";
  features: string[];
  image?: string;
  isPopular?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "breakfast" | "lunch" | "dinner" | "snack";
  image?: string;
  dietaryInfo: string[];
  ingredients: string[];
  calories?: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "paused" | "cancelled" | "expired";
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId?: string;
  guestEmail?: string;
  subscriptionId?: string;
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
  amount: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  paymentStatus: "pending" | "processing" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  paymentId?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingUpdates?: Array<{
    status: string;
    timestamp: Date;
    message: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  planId: string;
  plan: MealPlan;
  quantity: number;
}

export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  fullName?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}
