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

export function formatTimestamp(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
