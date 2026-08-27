/**
 * Lead schema as it lives in the BHOOKR Leads Google Sheet.
 * Field names mirror the sheet's column headers exactly.
 */

export interface LeadRow {
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
  status: string;
  lastStepCompleted: number | string;
  checkoutVisited: boolean | string;
  utmSource?: string;
  utmSubSource?: string;
  foodLove?: string;
  leadSource?: "website" | "client_form" | "both";
}

export interface LeadsApiResponse {
  success: boolean;
  rows: LeadRow[];
  total: number;
  error?: string;
}

export const LEAD_COLUMNS: { key: keyof LeadRow; label: string; width?: string }[] = [
  { key: "timestamp", label: "Submitted", width: "180px" },
  { key: "name", label: "Name", width: "160px" },
  { key: "email", label: "Email", width: "220px" },
  { key: "phoneNumber", label: "Phone", width: "140px" },
  { key: "utmSource", label: "Source", width: "100px" },
  { key: "utmSubSource", label: "Sub Source", width: "130px" },
  { key: "age", label: "Age", width: "70px" },
  { key: "gender", label: "Gender", width: "100px" },
  { key: "height", label: "Height", width: "90px" },
  { key: "weight", label: "Weight", width: "90px" },
  { key: "goal", label: "Goal", width: "150px" },
  { key: "diet", label: "Diet", width: "150px" },
  { key: "foodPreference", label: "Food Pref.", width: "130px" },
  { key: "physicalState", label: "Activity", width: "130px" },
  { key: "subscriptionType", label: "Plan Type", width: "120px" },
  { key: "plan", label: "Meals", width: "200px" },
  { key: "subscriptionStartDate", label: "Start Date", width: "120px" },
  { key: "status", label: "Status", width: "110px" },
  { key: "lastStepCompleted", label: "Step", width: "70px" },
  { key: "checkoutVisited", label: "Checkout", width: "100px" },
];

/**
 * Convert snake_case / lower_with_underscores values into a readable label.
 * The form stores values like "low_carb_high_protein" — humanize for display.
 */
export function humanize(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const s = String(value);
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseLeadDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;

  const str = String(input).trim();
  if (!str) return null;

  // Handle epoch milliseconds or seconds string (e.g. "1710000000000")
  if (/^\d{10,13}$/.test(str)) {
    const num = Number(str);
    const d = new Date(num > 1e11 ? num : num * 1000);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Handle ISO strings like "2026-08-17T18:30:00.000Z" or "2026-08-17T08:18:51.422Z" or "2026-08-17 18:30:00"
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1] || "0", 10);
    const month = parseInt(isoMatch[2] || "0", 10);
    const day = parseInt(isoMatch[3] || "0", 10);
    const hh = parseInt(isoMatch[4] || "12", 10);
    const mm = parseInt(isoMatch[5] || "0", 10);
    const ss = parseInt(isoMatch[6] || "0", 10);

    // If 18:30 UTC (standard Google Apps Script UTC rollover for midnight IST), adjust to 12:00 PM local
    if (hh === 18 && mm === 30) {
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    return new Date(year, month - 1, day, hh, mm, ss);
  }

  // Handle slash or dash dates like "18/08/2026", "18-08-2026", "8/17/2026", "17/8/2026 11:24:27"
  const dateMatch = str.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})(?:\s+(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?)?/);
  if (dateMatch) {
    const p1 = parseInt(dateMatch[1] || "0", 10);
    const p2 = parseInt(dateMatch[2] || "0", 10);
    const p3 = parseInt(dateMatch[3] || "0", 10);
    const hh = parseInt(dateMatch[4] || "12", 10);
    const mm = parseInt(dateMatch[5] || "0", 10);
    const ss = parseInt(dateMatch[6] || "0", 10);

    const year = p3 > 1000 ? p3 : (p1 > 1000 ? p1 : p3 + 2000);

    // D/M/YYYY e.g. 18/8/2026 (p1 > 12 -> p1 is day, p2 is month)
    if (p1 > 12) {
      return new Date(year, p2 - 1, p1, hh, mm, ss);
    }
    // M/D/YYYY e.g. 8/18/2026 (p2 > 12 -> p2 is day, p1 is month)
    if (p2 > 12) {
      return new Date(year, p1 - 1, p2, hh, mm, ss);
    }

    // Default for ambiguity (e.g. 05/04/2026): in Indian context (DD/MM/YYYY), p1 is day, p2 is month
    if (p3 > 1000) {
      return new Date(year, p2 - 1, p1, hh, mm, ss);
    }
    return new Date(year, p1 - 1, p2, hh, mm, ss);
  }

  const stdDate = new Date(str);
  if (!Number.isNaN(stdDate.getTime())) return stdDate;

  return null;
}

export function tsValue(v: string | number | Date | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = parseLeadDate(v);
  return d ? d.getTime() : 0;
}

export function formatTimestamp(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = parseLeadDate(value);
  if (!d) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

