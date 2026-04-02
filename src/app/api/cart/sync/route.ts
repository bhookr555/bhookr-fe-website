import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const CartItemSchema = z.object({
  planId: z.string(),
  plan: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.number(),
    duration: z.enum(["daily", "weekly", "monthly", "one-time"]),
    features: z.array(z.string()),
    image: z.string().optional(),
    isPopular: z.boolean().optional(),
  }),
  quantity: z.number().min(1),
});

const CartSyncSchema = z.object({
  items: z.array(CartItemSchema),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = CartSyncSchema.parse(body);

    // Store cart in cookie (encrypted in production)
    const cookieStore = await cookies();
    cookieStore.set("cart", JSON.stringify(items), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ 
      success: true, 
      message: "Cart synced successfully",
      itemCount: items.length 
    });
  } catch (error) {
    console.error("Cart sync error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid cart data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to sync cart" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cartCookie = cookieStore.get("cart");
    
    if (!cartCookie) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items = JSON.parse(cartCookie.value);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Cart retrieval error:", error);
    return NextResponse.json({ success: true, items: [] });
  }
}
