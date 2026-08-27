import type { LeadRow } from "@/lib/crm/leads";
import { tsValue, parseLeadDate } from "@/lib/crm/leads";

/** Extended type that tracks all source labels when a lead is merged */
export type MergedLeadRow = LeadRow & {
  allSources?: string[];
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
  if (lead.Date_name) return lead.Date_name;
  if (lead.Date) return lead.Date;
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
export function deduplicateAndMergeLeads(
  websiteLeads: LeadRow[] = [],
  clientFormLeads: LeadRow[] = []
): MergedLeadRow[] {
  const normalizedWeb: MergedLeadRow[] = websiteLeads.map((r) => {
    const raw = r as Record<string, any>;
    return {
      ...r,
      name: extractLeadName(raw) || r.name || "",
      timestamp: extractLeadTimestamp(raw) || r.timestamp || "",
      leadSource: r.leadSource || "website",
      allSources: [sourceLabel(r.leadSource || "website")],
    };
  });

  const normalizedClient: MergedLeadRow[] = clientFormLeads.map((r) => {
    const raw = r as Record<string, any>;
    return {
      ...r,
      name: extractLeadName(raw) || r.name || "",
      timestamp: extractLeadTimestamp(raw) || r.timestamp || "",
      leadSource: r.leadSource || "client_form",
      allSources: [sourceLabel(r.leadSource || "client_form")],
    };
  });

  // Index buckets: phone → index, email → index
  const phoneMap = new Map<string, number>();
  const emailMap = new Map<string, number>();
  const merged: MergedLeadRow[] = [];

  function findExistingIndex(row: MergedLeadRow): number {
    const phone = normalizePhone(row.phoneNumber);
    const email = normalizeEmail(row.email);
    if (phone && phoneMap.has(phone)) return phoneMap.get(phone)!;
    if (email && emailMap.has(email)) return emailMap.get(email)!;
    return -1;
  }

  function registerIndex(row: MergedLeadRow, idx: number): void {
    const phone = normalizePhone(row.phoneNumber);
    const email = normalizeEmail(row.email);
    if (phone) phoneMap.set(phone, idx);
    if (email) emailMap.set(email, idx);
  }

  const allRaw = [...normalizedWeb, ...normalizedClient];

  // Sort newest first before merging so primary = latest submission
  allRaw.sort((a, b) => tsValue(b.timestamp) - tsValue(a.timestamp));

  for (const row of allRaw) {
    const existingIdx = findExistingIndex(row);
    if (existingIdx === -1) {
      // New unique lead
      const idx = merged.length;
      merged.push({ ...row });
      registerIndex(row, idx);
    } else {
      // Duplicate — merge into existing entry
      const existing = merged[existingIdx]!;
      const base = mergeLeadRows(existing, row) as MergedLeadRow;

      // Combine all source labels deduped
      const existingSources = existing.allSources ?? [sourceLabel(existing.leadSource)];
      const newSources = row.allSources ?? [sourceLabel(row.leadSource)];
      const combinedSources = Array.from(new Set([...existingSources, ...newSources]));

      merged[existingIdx] = {
        ...base,
        allSources: combinedSources,
        leadSource: combinedSources.length > 1 ? "both" : base.leadSource,
      };

      // Re-register keys in case the secondary had a different phone/email
      registerIndex(row, existingIdx);
    }
  }

  // Sort final merged list newest first
  merged.sort((a, b) => tsValue(b.timestamp) - tsValue(a.timestamp));

  return merged;
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
