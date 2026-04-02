import { z } from "zod";

// Auth validators
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Contact form validator
export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// Checkout validator
export const checkoutSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Invalid phone number"),
  address: z.object({
    street: z.string().min(5, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(5, "ZIP code is required"),
    country: z.string().min(2, "Country is required"),
  }),
  paymentMethod: z.enum(["card", "upi", "netbanking"]),
});

// Subscription validator
export const subscriptionUpdateSchema = z.object({
  status: z.enum(["active", "paused", "cancelled"]),
});

// Subscription creation validator
export const subscriptionCreateSchema = z.object({
  orderId: z.string().optional(), // Link subscription to payment order
  formData: z.object({
    personalInfo: z.object({
      userId: z.string().optional(),
      email: z.string().email("Invalid email address"),
      name: z.string().min(2, "Name must be at least 2 characters"),
      phone: z.string().min(10, "Phone number must be at least 10 digits"),
    }),
    physicalInfo: z.object({
      age: z.number().min(1).max(120).optional(),
      weight: z.number().positive().optional(),
      height: z.number().positive().optional(),
    }).optional(),
    goalSelection: z.object({
      goals: z.array(z.string()).optional(),
    }).optional(),
    dietSelection: z.object({
      dietType: z.string().optional(),
    }).optional(),
    foodPreferenceSelection: z.object({
      preferences: z.array(z.string()).optional(),
    }).optional(),
    activityAndDuration: z.object({
      activityLevel: z.string().optional(),
      duration: z.string().min(1, "Duration is required"),
    }),
    planSelection: z.object({
      planType: z.string().min(1, "Plan type is required"),
      mealType: z.string().optional(),
      deliveryDays: z.array(z.string()).optional(),
      preferredSlot: z.string().optional(),
      startDate: z.string().optional(), // User's selected start date
    }),
    billingDetails: z.object({
      address: z.string().min(5, "Address is required"),
      city: z.string().min(2, "City is required"),
      state: z.string().min(2, "State is required"),
      zipCode: z.string().min(5, "ZIP code is required"),
    }).optional(),
  }),
  invoiceData: z.object({
    totalAmount: z.number().positive("Total amount must be positive"),
    subscriptionAmount: z.number().nonnegative().optional(),
    subscriptionGST: z.number().nonnegative().optional(),
    deliveryCharges: z.number().nonnegative().optional(),
    deliveryGST: z.number().nonnegative().optional(),
  }),
});

// Order/Checkout creation validator
export const orderCreateSchema = z.object({
  userId: z.string().optional(),
  userEmail: z.string().email("Invalid email address"),
  userName: z.string().min(2, "Name is required"),
  items: z.array(z.object({
    planId: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive(),
  })).min(1, "At least one item is required"),
  deliveryAddress: z.object({
    street: z.string().min(5, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(5, "ZIP code is required"),
    country: z.string().min(2, "Country is required"),
  }),
  paymentMethod: z.enum(["online"]),
  subtotal: z.number().positive(),
  deliveryFee: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  grandTotal: z.number().positive(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
