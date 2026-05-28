"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Utensils,
  Package,
  MessageCircle,
  Receipt,
  Boxes,
  LineChart,
  Settings,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/crm/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Leads", href: "/crm/leads", icon: Users, enabled: true },
  { label: "Customers", href: "/crm/customers", icon: Utensils, enabled: false },
  { label: "Subscriptions", href: "/crm/subscriptions", icon: Package, enabled: false },
  { label: "WhatsApp", href: "/crm/whatsapp", icon: MessageCircle, enabled: false },
  { label: "Billing", href: "/crm/billing", icon: Receipt, enabled: false },
  { label: "Inventory", href: "/crm/inventory", icon: Boxes, enabled: false },
  { label: "Analytics", href: "/crm/analytics", icon: LineChart, enabled: false },
  { label: "Settings", href: "/crm/settings", icon: Settings, enabled: false },
];

export function CrmSidebar() {
  const pathname = usePathname();

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
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            const baseClasses =
              "group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition";

            const content = (
              <>
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {!item.enabled && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Soon
                  </span>
                )}
              </>
            );

            if (!item.enabled) {
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
