import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { OrderRow } from "@/lib/crm/orders";

export const dynamic = "force-dynamic";

function mapSupabaseOrderToRow(row: Record<string, any>): OrderRow {
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
      { success: false, error: authStatus.error || "Forbidden", rows: [], total: 0 },
      { status: 403 }
    );
  }

  try {
    const { data, error, count } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[orders API] Supabase query error:", error);
      return NextResponse.json(
        { success: false, error: error.message, rows: [], total: 0 },
        { status: 500 }
      );
    }

    const rows = (data || []).map(mapSupabaseOrderToRow);

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
    console.error("[orders API] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch orders", rows: [], total: 0 },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing required orderId" },
        { status: 400 }
      );
    }

    const orderRecord = {
      order_id: String(orderId),
      customer_name: body.customerName || null,
      customer_email: body.customerEmail ? String(body.customerEmail).toLowerCase().trim() : null,
      customer_phone: body.customerPhone ? String(body.customerPhone) : null,
      delivery_full_name: body.deliveryFullName || body.customerName || null,
      delivery_phone: body.deliveryPhone || body.customerPhone || null,
      delivery_address: body.deliveryAddress || null,
      delivery_city: body.deliveryCity || null,
      delivery_state: body.deliveryState || null,
      delivery_pin_code: body.deliveryPinCode || null,
      items: body.items || [],
      item_count: body.itemCount ? Number(body.itemCount) : (Array.isArray(body.items) ? body.items.length : 0),
      subtotal: body.subtotal ? Number(body.subtotal) : null,
      item_gst: body.itemGST ? Number(body.itemGST) : null,
      delivery_base: body.deliveryBase ? Number(body.deliveryBase) : null,
      delivery_gst: body.deliveryGST ? Number(body.deliveryGST) : null,
      grand_total: body.grandTotal ? Number(body.grandTotal) : null,
      payment_status: body.paymentStatus || "success",
      payment_id: body.paymentId || null,
      payment_method: body.paymentMethod || null,
      payment_timestamp: body.paymentTimestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("orders")
      .upsert(orderRecord, { onConflict: "order_id" })
      .select()
      .single();

    if (error) {
      console.error("[orders POST] Supabase insert error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Order saved to Supabase",
      order: data,
    });
  } catch (err: any) {
    console.error("[orders POST] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save order" },
      { status: 500 }
    );
  }
}
