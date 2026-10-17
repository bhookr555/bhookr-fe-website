import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { SubscriptionRow } from "@/lib/crm/subscriptions";

export const dynamic = "force-dynamic";

function mapSupabaseSubscriptionToRow(row: Record<string, any>): SubscriptionRow {
  return {
    timestamp: row.created_at,
    name: row.name || "",
    email: row.email || "",
    phoneNumber: row.phone_number || "",
    age: row.age ?? "",
    gender: row.gender || "",
    height: row.height ?? "",
    weight: row.weight ?? "",
    goal: row.goal || "",
    diet: row.diet || "",
    foodPreference: row.food_preference || "",
    physicalState: row.physical_state || "",
    subscriptionType: row.subscription_type || "",
    plan: row.plan || "",
    subscriptionStartDate: row.subscription_start_date || "",
    subscriptionEndDate: row.subscription_end_date || "",
    deliveryFullName: row.delivery_full_name || "",
    deliveryPhone: row.delivery_phone || "",
    deliveryAddress: row.delivery_address || "",
    deliveryCity: row.delivery_city || "",
    deliveryState: row.delivery_state || "",
    deliveryPinCode: row.delivery_pin_code || "",
    paymentStatus: row.payment_status || "success",
    transactionId: row.transaction_id || "",
    orderId: row.order_id || "",
    amountPaid: row.amount_paid ?? 0,
    paymentMethod: row.payment_method || "",
    paymentTimestamp: row.payment_timestamp || row.created_at,
    status: row.status || "active",
  };
}

export async function GET(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden", rows: [], total: 0 },
      { status: 403 }
    );
  }

  try {
    const { data, error, count } = await supabaseAdmin
      .from("subscriptions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[subscriptions API] Supabase query error:", error);
      return NextResponse.json(
        { success: false, error: error.message, rows: [], total: 0 },
        { status: 500 }
      );
    }

    const rows = (data || []).map(mapSupabaseSubscriptionToRow);

    return NextResponse.json(
      {
        success: true,
        rows,
        total: count ?? rows.length,
        source: "supabase",
      },
      {
        headers: {
          "X-Database": "Supabase",
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[subscriptions API] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch subscriptions", rows: [], total: 0 },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, orderId } = body;

    if (!orderId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (orderId, email)" },
        { status: 400 }
      );
    }

    const subRecord = {
      order_id: String(orderId),
      transaction_id: body.transactionId ? String(body.transactionId) : null,
      name: String(name || "Subscriber"),
      email: String(email).trim().toLowerCase(),
      phone_number: body.phoneNumber ? String(body.phoneNumber) : null,
      age: body.age ? Number(body.age) : null,
      gender: body.gender || null,
      height: body.height ? Number(body.height) : null,
      weight: body.weight ? Number(body.weight) : null,
      goal: body.goal || null,
      diet: body.diet || null,
      food_preference: body.foodPreference || null,
      physical_state: body.physicalState || null,
      subscription_type: body.subscriptionType || null,
      plan: Array.isArray(body.plan) ? body.plan.join(", ") : (body.plan || null),
      subscription_start_date: body.subscriptionStartDate || null,
      subscription_end_date: body.subscriptionEndDate || null,
      status: body.status || "active",
      delivery_full_name: body.deliveryFullName || body.name || null,
      delivery_phone: body.deliveryPhone || body.phoneNumber || null,
      delivery_address: body.deliveryAddress || null,
      delivery_city: body.deliveryCity || null,
      delivery_state: body.deliveryState || null,
      delivery_pin_code: body.deliveryPinCode || null,
      payment_status: body.paymentStatus || "success",
      amount_paid: body.amountPaid ? Number(body.amountPaid) : null,
      payment_method: body.paymentMethod || null,
      payment_timestamp: body.paymentTimestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(subRecord, { onConflict: "order_id" })
      .select()
      .single();

    if (error) {
      console.error("[subscriptions POST] Supabase insert error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Subscription saved to Supabase",
      subscription: data,
    });
  } catch (err: any) {
    console.error("[subscriptions POST] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save subscription" },
      { status: 500 }
    );
  }
}
