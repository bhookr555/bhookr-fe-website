/**
 * Aggregate order rows by their delivery pincode so the locations map
 * can show "where customers are." Subscriptions are also passed in so
 * we can join by email and surface subscription totals on each pin.
 */

import type { OrderRow } from "@/lib/crm/orders";
import type { SubscriptionRow } from "@/lib/crm/subscriptions";
import { pincodeOrCenter } from "@/lib/crm/hyderabad-pincodes";

export interface LocationCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  orderCount: number;
  orderTotal: number;
  latestOrderAt: string;
  hasSubscription: boolean;
}

export interface LocationCluster {
  pincode: string;
  area: string;
  lat: number;
  lng: number;
  known: boolean;
  customers: LocationCustomer[];
  totalOrders: number;
  totalRevenue: number;
}

function tsValue(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function aggregateLocations(
  orders: OrderRow[],
  subs: SubscriptionRow[]
): LocationCluster[] {
  const subscriberEmails = new Set(
    subs
      .filter((s) => String(s.paymentStatus ?? "").toLowerCase() === "success")
      .map((s) => String(s.email ?? "").toLowerCase().trim())
  );

  // Group orders by pincode, then by customer email within each pincode.
  const byPincode = new Map<
    string,
    {
      pincode: string;
      area: string;
      lat: number;
      lng: number;
      known: boolean;
      byEmail: Map<string, LocationCustomer>;
    }
  >();

  for (const order of orders) {
    const pin = String(order.deliveryPinCode ?? "").trim();
    if (!pin) continue; // skip orders without a pincode

    const loc = pincodeOrCenter(pin);
    let bucket = byPincode.get(pin);
    if (!bucket) {
      bucket = {
        pincode: pin,
        area: loc.area,
        lat: loc.lat,
        lng: loc.lng,
        known: loc.known,
        byEmail: new Map(),
      };
      byPincode.set(pin, bucket);
    }

    const email = String(order.customerEmail ?? "").toLowerCase().trim() || `_${order.orderId}`;
    let cust = bucket.byEmail.get(email);
    if (!cust) {
      cust = {
        name: String(order.customerName ?? ""),
        email,
        phone: String(order.customerPhone ?? ""),
        address: String(order.deliveryAddress ?? ""),
        orderCount: 0,
        orderTotal: 0,
        latestOrderAt: "",
        hasSubscription: subscriberEmails.has(email),
      };
      bucket.byEmail.set(email, cust);
    }

    cust.orderCount += 1;
    cust.orderTotal += Number(order.grandTotal) || 0;
    if (tsValue(order.timestamp) > tsValue(cust.latestOrderAt)) {
      cust.latestOrderAt = String(order.timestamp ?? "");
    }
  }

  // Convert to clusters and add slight offsets to spread overlapping pins.
  const clusters: LocationCluster[] = [];
  for (const bucket of byPincode.values()) {
    const customers = Array.from(bucket.byEmail.values()).sort(
      (a, b) => b.orderTotal - a.orderTotal
    );
    const totalOrders = customers.reduce((s, c) => s + c.orderCount, 0);
    const totalRevenue = customers.reduce((s, c) => s + c.orderTotal, 0);
    clusters.push({
      pincode: bucket.pincode,
      area: bucket.area,
      lat: bucket.lat,
      lng: bucket.lng,
      known: bucket.known,
      customers,
      totalOrders,
      totalRevenue,
    });
  }

  // Sort by revenue (highest-spending neighbourhood first)
  clusters.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return clusters;
}
