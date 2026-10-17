import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/crm/leads";
import type { SubscriptionRow } from "@/lib/crm/subscriptions";
import type { OrderRow } from "@/lib/crm/orders";

export const dynamic = "force-dynamic";

function mapSupabaseLead(row: Record<string, any>, source: "website" | "client_form"): LeadRow {
  return {
    timestamp: row.created_at,
    name: row.name || "Lead",
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
    status: row.status || "lead",
    lastStepCompleted: row.last_step_completed ?? 0,
    checkoutVisited: Boolean(row.checkout_visited),
    utmSource: row.utm_source || "",
    utmSubSource: row.utm_sub_source || "",
    foodLove: row.food_love || "",
    leadSource: source,
  };
}

function mapSupabaseSubscription(row: Record<string, any>): SubscriptionRow {
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

function mapSupabaseOrder(row: Record<string, any>): OrderRow {
  let itemsStr = "";
  if (typeof row.items === "string") {
    itemsStr = row.items;
  } else if (Array.isArray(row.items)) {
    itemsStr = row.items.map((it: any) => `${it.name || "Item"} x${it.quantity || 1}`).join(", ");
  }

  return {
    timestamp: row.created_at,
    orderId: row.order_id,
    customerName: row.customer_name || "",
    customerEmail: row.customer_email || "",
    customerPhone: row.customer_phone || "",
    deliveryFullName: row.delivery_full_name || "",
    deliveryPhone: row.delivery_phone || "",
    deliveryAddress: row.delivery_address || "",
    deliveryCity: row.delivery_city || "",
    deliveryState: row.delivery_state || "",
    deliveryPinCode: row.delivery_pin_code || "",
    items: itemsStr,
    itemCount: row.item_count ?? 0,
    subtotal: row.subtotal ?? 0,
    itemGST: row.item_gst ?? 0,
    deliveryBase: row.delivery_base ?? 0,
    deliveryGST: row.delivery_gst ?? 0,
    grandTotal: row.grand_total ?? 0,
    paymentStatus: row.payment_status || "success",
    paymentId: row.payment_id || "",
    paymentMethod: row.payment_method || "",
    paymentTimestamp: row.payment_timestamp || row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden" },
      { status: 403 }
    );
  }

  try {
    // Execute all 4 queries in parallel in Supabase PostgreSQL
    const [leadsRes, clientFormRes, subsRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("*")
        .eq("lead_source", "website")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("leads")
        .select("*")
        .eq("lead_source", "client_form")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const websiteRows: LeadRow[] = (leadsRes.data || []).map((r) => mapSupabaseLead(r, "website"));
    const clientRows: LeadRow[] = (clientFormRes.data || []).map((r) => mapSupabaseLead(r, "client_form"));
    const subRows: SubscriptionRow[] = (subsRes.data || []).map(mapSupabaseSubscription);
    const ordRows: OrderRow[] = (ordersRes.data || []).map(mapSupabaseOrder);

    return NextResponse.json(
      {
        success: true,
        leads: {
          success: !leadsRes.error,
          rows: websiteRows,
          total: websiteRows.length,
        },
        clientForm: {
          success: !clientFormRes.error,
          rows: clientRows,
          total: clientRows.length,
        },
        subscriptions: {
          success: !subsRes.error,
          rows: subRows,
          total: subRows.length,
        },
        orders: {
          success: !ordersRes.error,
          rows: ordRows,
          total: ordRows.length,
        },
        meta: {
          cachedAt: new Date().toISOString(),
          source: "supabase",
        },
      },
      {
        headers: {
          "X-Database": "Supabase",
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("[dashboard API] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
