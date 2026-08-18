import type { LeadRow } from "@/lib/crm/leads";

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
  const tsP = new Date(primary.timestamp).getTime();
  const tsS = new Date(secondary.timestamp).getTime();
  if (!Number.isNaN(tsS) && (Number.isNaN(tsP) || tsS < tsP)) {
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
  allRaw.sort((a, b) => {
    const tsA = new Date(String(a.timestamp)).getTime();
    const tsB = new Date(String(b.timestamp)).getTime();
    const valA = Number.isNaN(tsA) ? 0 : tsA;
    const valB = Number.isNaN(tsB) ? 0 : tsB;
    return valB - valA;
  });

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
  merged.sort((a, b) => {
    const tsA = new Date(String(a.timestamp)).getTime();
    const tsB = new Date(String(b.timestamp)).getTime();
    const valA = Number.isNaN(tsA) ? 0 : tsA;
    const valB = Number.isNaN(tsB) ? 0 : tsB;
    return valB - valA;
  });

  return merged;
}
