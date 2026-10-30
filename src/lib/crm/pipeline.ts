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

export interface NoteHistoryEntry {
  text: string;
  savedBy: string;
  savedAt: string;
}

export interface StatusHistoryEntry {
  status: PipelineStatus;
  changedBy: string;
  changedAt: string;
}

export interface PipelineEntry {
  email: string;
  leadId?: string;
  status: PipelineStatus;
  updatedAt: string;
  updatedBy: CrmRole;
  notes?: string;
  noteHistory?: NoteHistoryEntry[];
  statusHistory?: StatusHistoryEntry[];
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
    label: "Interested",
    shortLabel: "Interested",
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
    phone?: string | number | null;
  }
): void {
  if (typeof window === "undefined") return;
  const key = normaliseEmail(email);
  const pKey = cleanPhoneKey(extras?.phone);
  if (!key && !pKey) return;
  const map = loadPipeline();
  const existing = (key ? map[key] : null) || (pKey ? map[pKey] : null);
  const entry: PipelineEntry = {
    email: key || pKey,
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
  if (key) map[key] = { ...map[key], ...entry };
  if (pKey) map[pKey] = { ...map[pKey], ...entry };
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

export function cleanPhoneKey(phone?: string | number | null): string {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length >= 10) return `phone_${digits.slice(-10)}`;
  return digits ? `phone_${digits}` : "";
}

export function normalizeSheetStatus(rawStatus?: string | null): PipelineStatus | null {
  if (!rawStatus) return null;
  const s = String(rawStatus).trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (s === "hot" || s === "hot_prospect" || s === "hotprospect" || s === "interested") return "hot_prospect";
  if (s === "followup" || s === "follow_up" || s === "follow_up_pending") return "follow_up";
  if (s === "pending") return "pending";
  if (s === "trial" || s === "trial_requested" || s === "trial_offered") return "trial_requested";
  if (s === "future" || s === "future_prospect") return "future_prospect";
  if (s === "converted" || s === "paid" || s === "active") return "converted";
  if (s === "rejected" || s === "sale_rejected" || s === "lost") return "sale_rejected";
  if (s === "new" || s === "lead") return "new";
  return null;
}

/**
 * Determine the effective pipeline status for a lead.
 * A verified online payment (in Subscriptions sheet) always wins —
 * those leads show as "converted" regardless of local state.
 * Checks by email key first, then falls back to phone_XXXXXXXXXX key,
 * raw phone digits, name, and finally status written in Google Sheets.
 */
export function getPipelineEntryForLead(
  pipeline: PipelineMap,
  leadId?: string,
  email?: string,
  phone?: string | number | null
): PipelineEntry | undefined {
  if (leadId && pipeline[leadId]) {
    return pipeline[leadId];
  }
  const emailKey = normaliseEmail(email ?? "");
  if (emailKey && pipeline[emailKey]) {
    return pipeline[emailKey];
  }
  const pKey = cleanPhoneKey(phone);
  if (pKey && pipeline[pKey]) {
    return pipeline[pKey];
  }
  const rawDigits = String(phone ?? "").replace(/\D/g, "");
  if (rawDigits) {
    if (pipeline[rawDigits]) return pipeline[rawDigits];
    if (rawDigits.length >= 10 && pipeline[rawDigits.slice(-10)]) return pipeline[rawDigits.slice(-10)];
  }
  return undefined;
}

/**
 * Determine the effective pipeline status for a lead.
 * Priority:
 * 1. Verified online payment (in Subscriptions) -> "converted" (source: "online")
 * 2. Exact lead row ID in pipeline -> local / database record
 * 3. Email match in pipeline
 * 4. Phone match in pipeline
 * 5. Sheet status fallback
 * 6. Default to "new"
 */
export function effectiveStatus(
  email: string,
  pipeline: PipelineMap,
  verifiedEmails: Set<string>,
  phone?: string | number | null,
  sheetStatus?: string,
  name?: string,
  leadId?: string
): { status: PipelineStatus; source: "online" | "local" | "sheet" | "default"; entry?: PipelineEntry } {
  const emailKey = normaliseEmail(email);
  if (emailKey && verifiedEmails.has(emailKey)) {
    return { status: "converted", source: "online" };
  }

  // 1. Direct lead unique ID match (exact row)
  if (leadId && pipeline[leadId]?.status) {
    return { status: pipeline[leadId].status, source: "local", entry: pipeline[leadId] };
  }

  // 2. Email key match
  const entryByEmail = emailKey ? pipeline[emailKey] : undefined;
  if (entryByEmail?.status) {
    return { status: entryByEmail.status, source: "local", entry: entryByEmail };
  }

  const strippedEmail = emailKey.replace(/\s+/g, "");
  const entryByStripped = strippedEmail ? pipeline[strippedEmail] : undefined;
  if (entryByStripped?.status) {
    return { status: entryByStripped.status, source: "local", entry: entryByStripped };
  }

  // 3. Phone key match
  const pKey = cleanPhoneKey(phone);
  const entryByPKey = pKey ? pipeline[pKey] : undefined;
  if (entryByPKey?.status) {
    return { status: entryByPKey.status, source: "local", entry: entryByPKey };
  }

  const rawDigits = String(phone ?? "").replace(/\D/g, "");
  if (rawDigits) {
    const pKey10 = `phone_${rawDigits.slice(-10)}`;
    const e10 = pipeline[pKey10];
    if (e10?.status) return { status: e10.status, source: "local", entry: e10 };

    const eRaw = pipeline[rawDigits];
    if (eRaw?.status) return { status: eRaw.status, source: "local", entry: eRaw };

    if (rawDigits.length >= 10) {
      const eSlice = pipeline[rawDigits.slice(-10)];
      if (eSlice?.status) return { status: eSlice.status, source: "local", entry: eSlice };
    }
  }

  if (name) {
    const nameKey = normaliseEmail(name);
    const eName = nameKey ? pipeline[nameKey] : undefined;
    if (eName?.status) return { status: eName.status, source: "local", entry: eName };
  }

  const fromSheet = normalizeSheetStatus(sheetStatus);
  if (fromSheet) {
    return { status: fromSheet, source: "sheet" };
  }

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
    leadId?: string;
    notes?: string;
    planType?: string;
    amount?: number;
    paymentMethod?: string;
    phone?: string | number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const primaryKey = extras?.leadId || normaliseEmail(email) || cleanPhoneKey(extras?.phone);
    if (!primaryKey) return { success: false, error: "Missing lead identifier" };

    const res = await fetch("/api/crm/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: primaryKey,
        leadId: extras?.leadId,
        status,
        role,
        extras,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      window.dispatchEvent(new CustomEvent(PIPELINE_CHANGED_EVENT));
      return { success: true };
    }
    return { success: false, error: data.error || `Server responded with ${res.status}` };
  } catch (err: any) {
    console.error("Failed to set pipeline status via API:", err);
    return { success: false, error: err.message || "Network error. Please try again." };
  }
}

export async function removePipelineEntryApi(email: string, leadId?: string): Promise<boolean> {
  try {
    const target = leadId || email;
    const res = await fetch("/api/crm/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", email: target, leadId }),
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
  currentStatus: PipelineStatus = "new",
  extras?: { leadId?: string; phone?: string | number | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const primaryKey = extras?.leadId || normaliseEmail(email) || cleanPhoneKey(extras?.phone);
    if (!primaryKey) return { success: false, error: "Missing lead identifier" };

    const res = await fetch("/api/crm/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveNote",
        email: primaryKey,
        leadId: extras?.leadId,
        status: currentStatus,
        role,
        extras: { notes, appendNote: true, ...extras },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      window.dispatchEvent(new CustomEvent(PIPELINE_CHANGED_EVENT));
      return { success: true };
    }
    return { success: false, error: data.error || `Server responded with ${res.status}` };
  } catch (err: any) {
    console.error("Failed to save note via API:", err);
    return { success: false, error: err.message || "Network error. Please try again." };
  }
}

