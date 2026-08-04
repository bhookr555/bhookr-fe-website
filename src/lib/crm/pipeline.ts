/**
 * Lead pipeline state — prototype storage layer.
 *
 * IMPORTANT: This NEVER writes to Google Sheets. All pipeline statuses
 * (follow-up, hot prospect, converted, etc.) live in localStorage of the
 * current browser only. They survive page reloads but not browser-data
 * clear, incognito sessions, or different devices. When we move to a
 * real backend, this whole file gets replaced with server-side writes.
 */

import type { CrmRole } from "@/lib/crm/auth";

export type PipelineStatus =
  | "new"
  | "pending"
  | "follow_up"
  | "trial_requested"
  | "hot_prospect"
  | "future_prospect"
  | "converted"
  | "sale_rejected";

export interface PipelineEntry {
  email: string;
  status: PipelineStatus;
  updatedAt: string;
  updatedBy: CrmRole;
  notes?: string;
  // Conversion-specific (only set when status === "converted"):
  planType?: string;
  amount?: number;
  paymentMethod?: string;
}

export type PipelineMap = Record<string, PipelineEntry>;

const STORAGE_KEY = "bhookr_crm_pipeline_v1";
const LEGACY_CONVERSIONS_KEY = "bhookr_crm_local_conversions_v1";
export const PIPELINE_CHANGED_EVENT = "bhookr-crm:pipeline-changed";

export interface PipelineStatusMeta {
  value: PipelineStatus;
  label: string;
  shortLabel: string;
  icon: string;
  pill: string;
  description: string;
}

export const PIPELINE_STATUSES: PipelineStatusMeta[] = [
  {
    value: "new",
    label: "New",
    shortLabel: "New",
    icon: "🆕",
    pill: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    description: "Just came in — not yet contacted",
  },
  {
    value: "pending",
    label: "Pending follow-up",
    shortLabel: "Pending",
    icon: "⏳",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    description: "Lead is pending follow-up or pending decision",
  },
  {
    value: "follow_up",
    label: "Follow-up pending",
    shortLabel: "Follow-up",
    icon: "📞",
    pill: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
    description: "Called but no answer — call back later",
  },
  {
    value: "trial_requested",
    label: "Trial requested",
    shortLabel: "Trial",
    icon: "🎁",
    pill: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
    description: "Wants the free 1-month trial",
  },
  {
    value: "hot_prospect",
    label: "Hot prospect",
    shortLabel: "Hot",
    icon: "🔥",
    pill: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
    description: "Strong interest — likely to convert",
  },
  {
    value: "future_prospect",
    label: "Future prospect",
    shortLabel: "Future",
    icon: "🌱",
    pill: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
    description: "Not now — candidate for later",
  },
  {
    value: "converted",
    label: "Converted",
    shortLabel: "Converted",
    icon: "✅",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    description: "Paid — became a customer",
  },
  {
    value: "sale_rejected",
    label: "Sale rejected",
    shortLabel: "Rejected",
    icon: "❌",
    pill: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    description: "Customer said no / not interested",
  },
];

export const PLAN_TYPE_OPTIONS = [
  { value: "lite", label: "Lite (1 meal/day)" },
  { value: "standard", label: "Standard (2 meals/day)" },
  { value: "elite", label: "Elite (3 meals/day)" },
  { value: "7_days", label: "7-day trial" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function normaliseEmail(email: string): string {
  return String(email ?? "").toLowerCase().trim();
}

function migrateFromLegacy(): PipelineMap {
  if (typeof window === "undefined") return {};
  const oldRaw = localStorage.getItem(LEGACY_CONVERSIONS_KEY);
  if (!oldRaw) return {};
  try {
    const oldData = JSON.parse(oldRaw);
    if (!oldData || typeof oldData !== "object") return {};
    const migrated: PipelineMap = {};
    for (const [rawEmail, value] of Object.entries(oldData)) {
      const c = value as {
        convertedAt?: string;
        convertedBy?: CrmRole;
        planType?: string;
        amount?: number;
        paymentMethod?: string;
        notes?: string;
      };
      const email = normaliseEmail(rawEmail);
      if (!email) continue;
      migrated[email] = {
        email,
        status: "converted",
        updatedAt: c.convertedAt || new Date().toISOString(),
        updatedBy: c.convertedBy || "admin",
        planType: c.planType,
        amount: c.amount,
        paymentMethod: c.paymentMethod,
        notes: c.notes,
      };
    }
    return migrated;
  } catch {
    return {};
  }
}

export function loadPipeline(): PipelineMap {
  if (typeof window === "undefined") return {};

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fall through to migration / empty */
    }
  }

  // First time loading — pick up any old conversion marks.
  const migrated = migrateFromLegacy();
  if (Object.keys(migrated).length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_CONVERSIONS_KEY);
    return migrated;
  }
  return {};
}

export function getPipelineEntry(email: string): PipelineEntry | null {
  const key = normaliseEmail(email);
  if (!key) return null;
  return loadPipeline()[key] ?? null;
}

export function setPipelineStatus(
  email: string,
  status: PipelineStatus,
  role: CrmRole,
  extras?: {
    notes?: string;
    planType?: string;
    amount?: number;
    paymentMethod?: string;
  }
): void {
  if (typeof window === "undefined") return;
  const key = normaliseEmail(email);
  if (!key) return;
  const map = loadPipeline();
  const existing = map[key];
  map[key] = {
    email: key,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: role,
    notes: extras?.notes ?? existing?.notes,
    planType:
      status === "converted"
        ? extras?.planType ?? existing?.planType
        : undefined,
    amount:
      status === "converted" ? extras?.amount ?? existing?.amount : undefined,
    paymentMethod:
      status === "converted"
        ? extras?.paymentMethod ?? existing?.paymentMethod
        : undefined,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(PIPELINE_CHANGED_EVENT));
}

export function removePipelineEntry(email: string): void {
  if (typeof window === "undefined") return;
  const map = loadPipeline();
  const key = normaliseEmail(email);
  if (!map[key]) return;
  delete map[key];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(PIPELINE_CHANGED_EVENT));
}

export function getStatusMeta(status: PipelineStatus): PipelineStatusMeta {
  return PIPELINE_STATUSES.find((s) => s.value === status) ?? PIPELINE_STATUSES[0]!;
}

/**
 * Determine the effective pipeline status for a lead.
 * A verified online payment (in Subscriptions sheet) always wins —
 * those leads show as "converted" regardless of local state.
 */
export function effectiveStatus(
  email: string,
  pipeline: PipelineMap,
  verifiedEmails: Set<string>
): { status: PipelineStatus; source: "online" | "local" | "default" } {
  const key = normaliseEmail(email);
  if (verifiedEmails.has(key)) return { status: "converted", source: "online" };
  const entry = pipeline[key];
  if (entry) return { status: entry.status, source: "local" };
  return { status: "new", source: "default" };
}

export async function fetchPipelineApi(): Promise<PipelineMap> {
  try {
    const res = await fetch("/api/crm/pipeline", { cache: "no-store" });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data.success && data.pipeline ? data.pipeline : {};
  } catch (err) {
    console.error("Failed to fetch pipeline from API:", err);
    return {};
  }
}

export async function setPipelineStatusApi(
  email: string,
  status: PipelineStatus,
  role: CrmRole,
  extras?: {
    notes?: string;
    planType?: string;
    amount?: number;
    paymentMethod?: string;
  }
): Promise<boolean> {
  try {
    const res = await fetch("/api/crm/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, status, role, extras }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.success) {
      window.dispatchEvent(new CustomEvent(PIPELINE_CHANGED_EVENT));
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to set pipeline status via API:", err);
    return false;
  }
}

export async function removePipelineEntryApi(email: string): Promise<boolean> {
  try {
    const res = await fetch("/api/crm/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", email }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.success) {
      window.dispatchEvent(new CustomEvent(PIPELINE_CHANGED_EVENT));
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to delete pipeline entry via API:", err);
    return false;
  }
}

export async function saveLeadNoteApi(
  email: string,
  notes: string,
  role: CrmRole,
  currentStatus: PipelineStatus = "new"
): Promise<boolean> {
  // WHY: removed the localStorage dual-write (setPipelineStatus call).
  // Firestore is the source of truth. Writing to localStorage was
  // firing PIPELINE_CHANGED_EVENT twice → double re-render on every save.
  return setPipelineStatusApi(email, currentStatus, role, { notes });
}

