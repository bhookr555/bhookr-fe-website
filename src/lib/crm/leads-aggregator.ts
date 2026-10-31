import type { LeadRow } from "@/lib/crm/leads";
import { tsValue, parseLeadDate } from "@/lib/crm/leads";

/** Extended type that tracks all source labels when a lead is merged */
export type MergedLeadRow = LeadRow & {
  allSources?: string[];
  identityConflict?: boolean;
};

/**
 * Normalizes phone numbers for accurate deduplication.
 * Strips all non-digit characters and handles Indian country codes (+91, 0 prefix).
 * Returns standard 10-digit mobile number if length >= 10.
 */
export function normalizePhone(phone: string | number | null | undefined): string {
  if (phone === null || phone === undefined || phone === "") return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";

  // 12-digit Indian format (91XXXXXXXXXX) -> last 10 digits
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // 11-digit format with leading 0 (0XXXXXXXXXX) -> last 10 digits
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  // 10+ digits -> take last 10 digits
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normalizes email address for deduplication.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return String(email).trim().toLowerCase();
}

/**
 * Helper to check if a string/value is populated and not an empty placeholder like "—" or "N/A"
 */
function isPopulated(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  return str !== "" && str !== "—" && str !== "N/A" && str !== "null" && str !== "undefined";
}

/**
 * Merges two lead objects belonging to the same individual into one unified LeadRow.
 * Fills missing fields in primary with data from secondary.
 */
export function mergeLeadRows(primary: LeadRow, secondary: LeadRow): LeadRow {
  const merged: LeadRow = { ...primary };

  // Combine source tags if they come from different sources
  const srcP = primary.leadSource || "website";
  const srcS = secondary.leadSource || "client_form";
  if (srcP !== srcS) {
    merged.leadSource = "both";
  } else {
    merged.leadSource = srcP;
  }

  // Preserve best/non-empty values for each field
  const keys: (keyof LeadRow)[] = [
    "name",
    "email",
    "phoneNumber",
    "age",
    "gender",
    "height",
    "weight",
    "goal",
    "diet",
    "foodPreference",
    "physicalState",
    "subscriptionType",
    "plan",
    "subscriptionStartDate",
    "status",
    "lastStepCompleted",
    "checkoutVisited",
    "utmSource",
    "utmSubSource",
    "foodLove",
  ];

  for (const key of keys) {
    if (!isPopulated(merged[key]) && isPopulated(secondary[key])) {
      (merged as any)[key] = secondary[key];
    }
  }

  // Keep earlier timestamp as initial contact date
  const tsP = tsValue(primary.timestamp);
  const tsS = tsValue(secondary.timestamp);
  if (tsS > 0 && (tsP === 0 || tsS < tsP)) {
    merged.timestamp = secondary.timestamp;
  }

  return merged;
}

export function extractLeadTimestamp(lead: Record<string, any>): string | number {
  if (lead.timestamp) return lead.timestamp;
  if (lead.Timestamp) return lead.Timestamp;
  if (lead[""]) return lead[""];
  if (lead[" Date"]) return lead[" Date"];
  if (lead["Date"]) return lead["Date"];
  if (lead.Date_name) return lead.Date_name;
  if (lead.date_name) return lead.date_name;
  if (lead.date) return lead.date;
  if (lead.Submitted) return lead.Submitted;
  if (lead.submitted) return lead.submitted;
  if (lead.created_at) return lead.created_at;
  if (lead.createdAt) return lead.createdAt;
  if (lead.subscriptionStartDate) return lead.subscriptionStartDate;
  return "";
}

export function extractLeadName(lead: Record<string, any>): string {
  if (lead.name && String(lead.name).trim()) return String(lead.name).trim();
  if (lead.Date_name) {
    const str = String(lead.Date_name).trim();
    const parts = str.split(/\s+/);
    const firstPart = parts[0] || "";
    if (parts.length > 1 && /^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/.test(firstPart)) {
      return parts.slice(1).join(" ");
    }
  }
  return "";
}

/** Source label helpers */
const SOURCE_LABEL: Record<string, string> = {
  website: "Website Lead",
  client_form: "Client Form",
  both: "Website + Client Form",
};

function sourceLabel(src: string | undefined): string {
  return SOURCE_LABEL[src ?? "website"] ?? "Website Lead";
}

/**
 * Deduplicates and merges website leads and client sheet leads.
 *
 * Strategy:
 * 1. Matches by normalised Phone Number first (strongest signal).
 * 2. Matches by normalised Email second.
 * 3. When a match is found the rows are merged via mergeLeadRows() — earliest
 *    timestamp wins, empty fields are filled from the secondary row, and
 *    `allSources` is set to the union of source labels.
 * 4. Returns a single unified array sorted by timestamp (newest first).
 */
export function sanitizeLeadRow<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const k = String(key).trim();
    if (k === "") {
      if (!clean.timestamp && val) {
        clean.timestamp = val;
      }
    } else {
      clean[k] = val;
    }
  }
  return clean as T;
}

export function deduplicateAndMergeLeads(
  websiteLeads: LeadRow[] = [],
  clientFormLeads: LeadRow[] = []
): MergedLeadRow[] {
  const normalizedWeb: MergedLeadRow[] = websiteLeads.map((r) => {
    const raw = sanitizeLeadRow(r as Record<string, any>);
    return {
      ...raw,
      id: raw.id || r.id,
      sessionId: raw.sessionId || raw.session_id,
      name: extractLeadName(raw) || raw.name || "Lead",
      timestamp: extractLeadTimestamp(raw) || raw.timestamp || "",
      leadSource: "website",
      allSources: ["Website Lead"],
      isRepeat: Boolean(raw.isRepeat || raw.is_repeat),
      firstLeadId: raw.firstLeadId || raw.first_lead_id || null,
      formStatus: raw.formStatus || raw.form_status,
      lastStepCompleted: raw.lastStepCompleted ?? raw.last_step_completed ?? 0,
      totalSteps: raw.totalSteps ?? raw.total_steps ?? 9,
      address: raw.address,
      city: raw.city,
      state: raw.state,
      pinCode: raw.pinCode || raw.pin_code,
    } as MergedLeadRow;
  });

  const normalizedClient: MergedLeadRow[] = clientFormLeads.map((r) => {
    const raw = sanitizeLeadRow(r as Record<string, any>);
    return {
      ...raw,
      id: raw.id || r.id,
      sessionId: raw.sessionId || raw.session_id,
      name: extractLeadName(raw) || raw.name || "Lead",
      timestamp: extractLeadTimestamp(raw) || raw.timestamp || "",
      leadSource: "client_form",
      allSources: ["Google Form Lead"],
      isRepeat: Boolean(raw.isRepeat || raw.is_repeat),
      firstLeadId: raw.firstLeadId || raw.first_lead_id || null,
      formStatus: raw.formStatus || raw.form_status,
      lastStepCompleted: raw.lastStepCompleted ?? raw.last_step_completed ?? 0,
      totalSteps: raw.totalSteps ?? raw.total_steps ?? 9,
      address: raw.address,
      city: raw.city,
      state: raw.state,
      pinCode: raw.pinCode || raw.pin_code,
    } as MergedLeadRow;
  });

  // Consolidate rows that share the EXACT same non-empty sessionId
  // (e.g. progressive step saves within one single browser session).
  // Separate submissions across different sessions, dates, or sources (Website vs Google Form)
  // are NEVER collapsed into one, preserving all user submissions.
  const sessionMap = new Map<string, MergedLeadRow>();
  const distinctLeads: MergedLeadRow[] = [];

  for (const lead of [...normalizedWeb, ...normalizedClient]) {
    const s = String(lead.sessionId || (lead.utmSubSource?.startsWith("sess:") ? lead.utmSubSource.slice(5) : "") || "").trim();
    if (s) {
      if (!sessionMap.has(s)) {
        sessionMap.set(s, { ...lead });
      } else {
        const existing = sessionMap.get(s)!;
        const higherStep = Math.max(Number(existing.lastStepCompleted || 0), Number(lead.lastStepCompleted || 0));
        const merged = mergeLeadRows(existing, lead);
        merged.lastStepCompleted = higherStep;
        if (
          existing.formStatus === "completed" ||
          lead.formStatus === "completed" ||
          higherStep >= 8 ||
          existing.checkoutVisited ||
          lead.checkoutVisited
        ) {
          merged.formStatus = "completed";
        }
        sessionMap.set(s, merged);
      }
    } else {
      distinctLeads.push({ ...lead });
    }
  }

  const allDistinct = [...sessionMap.values(), ...distinctLeads];

  // Cross-reference all distinct submissions to calculate duplicate / repeat occurrences.
  // Matches 10-digit phone number or normalized email across ALL sources.
  const phoneCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();

  for (const lead of allDistinct) {
    const p = normalizePhone(lead.phoneNumber);
    const e = normalizeEmail(lead.email);
    if (p && p.length === 10) {
      phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
    }
    if (e && !e.endsWith("@bhookr.lead")) {
      emailCounts.set(e, (emailCounts.get(e) || 0) + 1);
    }
  }

  for (const lead of allDistinct) {
    const p = normalizePhone(lead.phoneNumber);
    const e = normalizeEmail(lead.email);
    const pCount = (p && p.length === 10) ? (phoneCounts.get(p) || 0) : 0;
    const eCount = (e && !e.endsWith("@bhookr.lead")) ? (emailCounts.get(e) || 0) : 0;
    const count = Math.max(pCount, eCount, 1);
    const isDup = count >= 2 || Boolean(lead.isRepeat);

    lead.duplicateCount = count;
    lead.isRepeat = isDup;
    lead.isDuplicate = isDup;
  }

  allDistinct.sort((a, b) => tsValue(b.timestamp) - tsValue(a.timestamp));
  return allDistinct;
}

export const MERGED_LEADS_CACHE_TTL_MS = 60 * 1000;

interface MergedLeadsCacheStore {
  fingerprint: string;
  timestamp: number;
  data: MergedLeadRow[];
}

let memoryMergedLeadsCache: MergedLeadsCacheStore | null = null;

function computeLeadsFingerprint(web: LeadRow[], client: LeadRow[]): string {
  const webLen = web.length;
  const clientLen = client.length;
  const webFirst = webLen > 0 ? `${web[0]?.email || ""}:${web[0]?.phoneNumber || ""}:${web[0]?.timestamp || ""}` : "";
  const webLast = webLen > 0 ? `${web[webLen - 1]?.email || ""}:${web[webLen - 1]?.phoneNumber || ""}:${web[webLen - 1]?.timestamp || ""}` : "";
  const clientFirst = clientLen > 0 ? `${client[0]?.email || ""}:${client[0]?.phoneNumber || ""}:${client[0]?.timestamp || ""}` : "";
  const clientLast = clientLen > 0 ? `${client[clientLen - 1]?.email || ""}:${client[clientLen - 1]?.phoneNumber || ""}:${client[clientLen - 1]?.timestamp || ""}` : "";
  return `w${webLen}_${webFirst}_${webLast}_c${clientLen}_${clientFirst}_${clientLast}`;
}

/**
 * Cache wrapper around deduplicateAndMergeLeads to avoid re-running expensive matching loops
 * when underlying raw leads are unchanged within the cache window.
 */
export function getMergedLeadsCached(
  websiteLeads: LeadRow[] = [],
  clientFormLeads: LeadRow[] = []
): MergedLeadRow[] {
  const fp = computeLeadsFingerprint(websiteLeads, clientFormLeads);
  const now = Date.now();

  if (
    memoryMergedLeadsCache &&
    memoryMergedLeadsCache.fingerprint === fp &&
    now - memoryMergedLeadsCache.timestamp < MERGED_LEADS_CACHE_TTL_MS
  ) {
    return memoryMergedLeadsCache.data;
  }

  const result = deduplicateAndMergeLeads(websiteLeads, clientFormLeads);
  memoryMergedLeadsCache = {
    fingerprint: fp,
    timestamp: now,
    data: result,
  };
  return result;
}
