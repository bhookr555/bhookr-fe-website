import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]),
  paymentStatus: z.enum(["pending", "processing", "paid", "failed", "refunded"]).optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status, paymentStatus, message } = UpdateStatusSchema.parse(body);

    const orderRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();
    const trackingUpdates = orderData.trackingUpdates || [];

    // Add new tracking update
    trackingUpdates.push({
      status,
      timestamp: new Date(),
      message: message || getDefaultMessage(status),
    });

    const updateData: any = {
      status,
      trackingUpdates,
      updatedAt: new Date(),
    };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    // If delivered, set actual delivery date
    if (status === "delivered") {
      updateData.actualDelivery = new Date();
    }

    await updateDoc(orderRef, updateData);

    return NextResponse.json({
      success: true,
      order: { id: orderId, ...updateData },
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update order status" },
      { status: 500 }
    );
  }
}

function getDefaultMessage(status: string): string {
  const messages: Record<string, string> = {
    pending: "Order received and being processed",
    confirmed: "Order confirmed",
    preparing: "Your order is being prepared",
    out_for_delivery: "Order is out for delivery",
    delivered: "Order has been delivered",
    cancelled: "Order has been cancelled",
  };
  return messages[status] || "Order status updated";
}
