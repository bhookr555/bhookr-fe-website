import type { LeadRow } from "@/lib/crm/leads";

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

/**
 * Deduplicates and merges website leads and client sheet leads.
 * 
 * Strategy:
 * 1. Matches by Phone Number first (strongest match).
 * 2. Matches by Email second (second strongest match).
 * 3. Returns a single unified array sorted by timestamp (newest first).
 */
export function deduplicateAndMergeLeads(
  websiteLeads: LeadRow[] = [],
  clientFormLeads: LeadRow[] = []
): LeadRow[] {
  const normalizedWeb: LeadRow[] = websiteLeads.map((r) => ({
    ...r,
    leadSource: r.leadSource || "website",
  }));

  const normalizedClient: LeadRow[] = clientFormLeads.map((r) => ({
    ...r,
    leadSource: r.leadSource || "client_form",
  }));

  const allRaw = [...normalizedWeb, ...normalizedClient];
  const uniqueLeads: LeadRow[] = [];

  // Maps for fast phone and email lookups
  const phoneIndexMap = new Map<string, number>();
  const emailIndexMap = new Map<string, number>();

  for (const rawLead of allRaw) {
    const phoneKey = normalizePhone(rawLead.phoneNumber);
    const emailKey = normalizeEmail(rawLead.email);

    let matchIndex: number | undefined;

    if (phoneKey && phoneIndexMap.has(phoneKey)) {
      matchIndex = phoneIndexMap.get(phoneKey);
    } else if (emailKey && emailIndexMap.has(emailKey)) {
      matchIndex = emailIndexMap.get(emailKey);
    }

    if (matchIndex !== undefined && uniqueLeads[matchIndex]) {
      // Merge with existing record
      const existing = uniqueLeads[matchIndex]!;
      const merged = mergeLeadRows(existing, rawLead);
      uniqueLeads[matchIndex] = merged;

      // Update index mappings for any new phone/email fields brought in by merge
      const mergedPhoneKey = normalizePhone(merged.phoneNumber);
      const mergedEmailKey = normalizeEmail(merged.email);

      if (mergedPhoneKey) phoneIndexMap.set(mergedPhoneKey, matchIndex);
      if (mergedEmailKey) emailIndexMap.set(mergedEmailKey, matchIndex);
    } else {
      // New unique lead
      const newIndex = uniqueLeads.length;
      uniqueLeads.push(rawLead);

      if (phoneKey) phoneIndexMap.set(phoneKey, newIndex);
      if (emailKey) emailIndexMap.set(emailKey, newIndex);
    }
  }

  // Sort by timestamp newest first
  uniqueLeads.sort((a, b) => {
    const tsA = new Date(a.timestamp).getTime();
    const tsB = new Date(b.timestamp).getTime();
    const valA = Number.isNaN(tsA) ? 0 : tsA;
    const valB = Number.isNaN(tsB) ? 0 : tsB;
    return valB - valA;
  });

  return uniqueLeads;
}
