"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Utensils,
  Package,
  ShoppingBag,
  Map,
  MessageCircle,
  Receipt,
  Boxes,
  LineChart,
  Settings,
  Eye,
  FileText,
  RotateCw,
} from "lucide-react";
import type { CrmRole } from "@/lib/crm/auth";
import {
  type CrmModule,
  type PermissionMatrix,
  DEFAULT_PERMISSIONS,
  PERMISSIONS_CHANGED_EVENT,
  loadPermissions,
} from "@/lib/crm/permissions";

interface NavItem {
  moduleId: CrmModule;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  built: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { moduleId: "dashboard", label: "Sales Dashboard", href: "/crm/dashboard", icon: LayoutDashboard, built: true },
  { moduleId: "customers", label: "Active Customers", href: "/crm/customers", icon: Utensils, built: true },
  { moduleId: "renewals", label: "Renewals", href: "/crm/renewals", icon: RotateCw, built: true },
  { moduleId: "subscriptions", label: "Subscriptions", href: "/crm/subscriptions", icon: Package, built: false },
  { moduleId: "orders", label: "Orders", href: "/crm/orders", icon: ShoppingBag, built: false },
  { moduleId: "locations", label: "Locations", href: "/crm/locations", icon: Map, built: false },
  { moduleId: "whatsapp", label: "WhatsApp", href: "/crm/whatsapp", icon: MessageCircle, built: false },
  { moduleId: "billing", label: "Billing", href: "/crm/billing", icon: Receipt, built: true },
  { moduleId: "inventory", label: "Inventory", href: "/crm/inventory", icon: Boxes, built: false },
  { moduleId: "analytics", label: "Analytics", href: "/crm/analytics", icon: LineChart, built: false },
  { moduleId: "settings", label: "Settings", href: "/crm/settings", icon: Settings, built: true },
  { moduleId: "report", label: "Project Report", href: "/crm/report", icon: FileText, built: false },
];

interface CrmSidebarProps {
  role: CrmRole;
}

export function CrmSidebar({ role }: CrmSidebarProps) {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    setPermissions(loadPermissions());
    const handler = () => setPermissions(loadPermissions());
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handler);
  }, []);

  const visibleItems = NAV_ITEMS.filter(
    (item) => permissions[role][item.moduleId] !== "none"
  );

  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5 dark:border-gray-800">
        <span className="text-base font-bold tracking-tight text-[#E31E24]">
          BHOOKR
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          CRM
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const active = pathname === item.href;
            const level = permissions[role][item.moduleId];
            const isReadOnly = level === "read";
            const Icon = item.icon;

            const baseClasses =
              "group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition";

            const content = (
              <>
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {isReadOnly && item.built && (
                    <Eye className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {!item.built && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Soon
                    </span>
                  )}
                </span>
              </>
            );

            if (!item.built) {
              return (
                <li key={item.href}>
                  <div
                    className={`${baseClasses} cursor-not-allowed text-gray-400 dark:text-gray-500`}
                    aria-disabled="true"
                    title="Coming soon"
                  >
                    {content}
                  </div>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${baseClasses} ${
                    active
                      ? "bg-red-50 text-[#E31E24] dark:bg-red-950/40 dark:text-red-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                  title={isReadOnly ? "Read-only access" : undefined}
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 px-5 py-3 text-[11px] text-gray-400 dark:border-gray-800 dark:text-gray-500">
        Prototype build · v0.1
      </div>
    </aside>
  );
}
