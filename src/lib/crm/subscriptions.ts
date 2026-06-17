/**
 * Subscription row schema from the BHOOKR Subscriptions sheet.
 * Mirrors the column headers returned by the Apps Script list endpoint.
 */

export interface SubscriptionRow {
  timestamp: string | number;
  name: string;
  email: string;
  phoneNumber: string | number;
  age: number | string;
  gender: string;
  height: number | string;
  weight: number | string;
  goal: string;
  diet: string;
  foodPreference: string;
  physicalState: string;
  subscriptionType: string;
  plan: string;
  subscriptionStartDate: string;
  deliveryFullName?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPinCode?: string;
  paymentStatus: string;
  transactionId: string;
  orderId: string;
  amountPaid: number | string;
  paymentMethod: string;
  paymentTimestamp: string;
  status: string;
}

export interface SubscriptionsApiResponse {
  success: boolean;
  rows: SubscriptionRow[];
  total: number;
  error?: string;
}

export const SUBSCRIPTION_COLUMNS: {
  key: keyof SubscriptionRow;
  label: string;
  width?: string;
}[] = [
  { key: "timestamp", label: "Paid On", width: "170px" },
  { key: "name", label: "Customer", width: "150px" },
  { key: "email", label: "Email", width: "220px" },
  { key: "phoneNumber", label: "Phone", width: "140px" },
  { key: "subscriptionType", label: "Plan Type", width: "120px" },
  { key: "plan", label: "Meals", width: "180px" },
  { key: "subscriptionStartDate", label: "Start Date", width: "130px" },
  { key: "amountPaid", label: "Amount", width: "110px" },
  { key: "paymentStatus", label: "Payment", width: "120px" },
  { key: "paymentMethod", label: "Method", width: "110px" },
  { key: "transactionId", label: "Transaction ID", width: "180px" },
  { key: "orderId", label: "Order ID", width: "200px" },
  { key: "status", label: "Status", width: "120px" },
  { key: "deliveryCity", label: "City", width: "120px" },
  { key: "deliveryState", label: "State", width: "120px" },
];

export interface CustomerAggregate {
  email: string;
  name: string;
  phoneNumber: string | number;
  totalSpent: number;
  subscriptionCount: number;
  currentStatus: string;
  latestPlan: string;
  firstPaidAt: string;
  latestPaidAt: string;
  city: string;
}

/**
 * Group subscription rows by email to build a per-customer view.
 * One row per unique email, with aggregated totals + latest subscription details.
 */
export function aggregateByCustomer(rows: SubscriptionRow[]): CustomerAggregate[] {
  const byEmail = new Map<string, SubscriptionRow[]>();
  for (const row of rows) {
    const email = String(row.email ?? "").toLowerCase().trim();
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(row);
    byEmail.set(email, list);
  }

  const result: CustomerAggregate[] = [];
  for (const [email, list] of byEmail.entries()) {
    const sorted = [...list].sort((a, b) => tsValue(b.timestamp) - tsValue(a.timestamp));
    const latest = sorted[0]!;
    const earliest = sorted[sorted.length - 1]!;

    const totalSpent = list.reduce((sum, r) => {
      const n = Number(r.amountPaid);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    // Status: active if any subscription is active, otherwise latest one's status
    const hasActive = list.some((r) => String(r.status).toLowerCase() === "active");
    const currentStatus = hasActive ? "active" : String(latest.status ?? "");

    result.push({
      email,
      name: String(latest.name ?? ""),
      phoneNumber: latest.phoneNumber ?? "",
      totalSpent,
      subscriptionCount: list.length,
      currentStatus,
      latestPlan: `${latest.subscriptionType ?? ""}${latest.plan ? " — " + latest.plan : ""}`,
      firstPaidAt: String(earliest.timestamp ?? ""),
      latestPaidAt: String(latest.timestamp ?? ""),
      city: String(latest.deliveryCity ?? ""),
    });
  }

  return result.sort((a, b) => tsValue(b.latestPaidAt) - tsValue(a.latestPaidAt));
}

function tsValue(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function formatINR(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
