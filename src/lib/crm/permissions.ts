/**
 * CRM permissions — prototype storage layer.
 * Persists per-role module access in localStorage so the Admin can change
 * who sees what without a backend. Will move to Firestore in Phase 2.
 */

import type { CrmRole } from "@/lib/crm/auth";

export type PermissionLevel = "none" | "read" | "write";

export type CrmModule =
  | "dashboard"
  | "leads"
  | "customers"
  | "renewals"
  | "subscriptions"
  | "orders"
  | "locations"
  | "whatsapp"
  | "billing"
  | "inventory"
  | "analytics"
  | "settings"
  | "report";

export interface ModuleMeta {
  id: CrmModule;
  label: string;
}

export const CRM_MODULES: ModuleMeta[] = [
  { id: "dashboard", label: "Sales Dashboard" },
  { id: "customers", label: "Active Customers" },
  { id: "renewals", label: "Renewals" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "orders", label: "Orders" },
  { id: "locations", label: "Locations" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "billing", label: "Billing" },
  { id: "inventory", label: "Inventory" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
  { id: "report", label: "Project Report" },
];

export type PermissionMatrix = Record<CrmRole, Record<CrmModule, PermissionLevel>>;

const STORAGE_KEY = "bhookr_crm_permissions_v1";
export const PERMISSIONS_CHANGED_EVENT = "bhookr-crm:permissions-changed";

// Default starting point. Admin can edit any of these freely.
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  admin: {
    dashboard: "write",
    leads: "write",
    customers: "write",
    renewals: "write",
    subscriptions: "write",
    orders: "write",
    locations: "write",
    whatsapp: "write",
    billing: "write",
    inventory: "write",
    analytics: "write",
    settings: "write",
    report: "write",
  },
  auditor: {
    dashboard: "read",
    leads: "read",
    customers: "read",
    renewals: "read",
    subscriptions: "read",
    orders: "read",
    locations: "read",
    whatsapp: "read",
    billing: "read",
    inventory: "read",
    analytics: "read",
    settings: "read",
    report: "read",
  },
  manager: {
    dashboard: "read",
    leads: "write",
    customers: "write",
    renewals: "write",
    subscriptions: "write",
    orders: "write",
    locations: "read",
    whatsapp: "write",
    billing: "read",
    inventory: "write",
    analytics: "read",
    settings: "none",
    report: "read",
  },
  telecaller: {
    dashboard: "read",
    leads: "write",
    customers: "read",
    renewals: "write",
    subscriptions: "none",
    orders: "read",
    locations: "none",
    whatsapp: "write",
    billing: "none",
    inventory: "none",
    analytics: "none",
    settings: "none",
    report: "read",
  },
};

export function loadPermissions(): PermissionMatrix {
  if (typeof window === "undefined") return DEFAULT_PERMISSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERMISSIONS;
    const parsed = JSON.parse(raw) as Partial<PermissionMatrix>;
    // Merge with defaults so missing keys (added later) don't break the UI.
    return {
      admin: { ...DEFAULT_PERMISSIONS.admin, ...(parsed.admin ?? {}) },
      auditor: { ...DEFAULT_PERMISSIONS.auditor, ...(parsed.auditor ?? {}) },
      manager: { ...DEFAULT_PERMISSIONS.manager, ...(parsed.manager ?? {}) },
      telecaller: { ...DEFAULT_PERMISSIONS.telecaller, ...(parsed.telecaller ?? {}) },
    };
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

export function savePermissions(matrix: PermissionMatrix): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
  window.dispatchEvent(new CustomEvent(PERMISSIONS_CHANGED_EVENT));
}

export function resetPermissions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(PERMISSIONS_CHANGED_EVENT));
}

export function getPermission(
  matrix: PermissionMatrix,
  role: CrmRole,
  module: CrmModule
): PermissionLevel {
  return matrix[role]?.[module] ?? "none";
}

export const PERMISSION_OPTIONS: { value: PermissionLevel; label: string; description: string }[] = [
  { value: "none", label: "No access", description: "Module hidden from sidebar" },
  { value: "read", label: "Read only", description: "Visible, edit disabled" },
  { value: "write", label: "Read & Write", description: "Full access" },
];
