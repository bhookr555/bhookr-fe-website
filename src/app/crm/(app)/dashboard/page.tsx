"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users,
  Utensils,
  Package,
  MessageCircle,
  Receipt,
  Boxes,
  LineChart,
} from "lucide-react";
import { getCurrentRole, getRoleMeta, type CrmRole } from "@/lib/crm/auth";

export default function CrmDashboardPage() {
  const [role, setRole] = useState<CrmRole | null>(null);

  useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  const meta = role ? getRoleMeta(role) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Welcome, {meta?.label ?? "—"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {meta?.description ?? "Loading your role…"}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Quick stats
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total leads", value: "—" },
            { label: "Today", value: "—" },
            { label: "Hot prospects", value: "—" },
            { label: "Converted", value: "—" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {kpi.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Numbers will populate once the Google Sheet is connected.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Modules
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            href="/crm/leads"
            label="Leads"
            description="View every form submission from bhookr.com"
            icon={Users}
            enabled
          />
          <ModuleCard label="Customers" description="Profiles, history, preferences" icon={Utensils} />
          <ModuleCard label="Subscriptions" description="Active, paused, expiring plans" icon={Package} />
          <ModuleCard label="WhatsApp" description="Templates, conversations, broadcasts" icon={MessageCircle} />
          <ModuleCard label="Billing" description="GST invoices, payment reconciliation" icon={Receipt} />
          <ModuleCard label="Inventory" description="Stock, suppliers, ingredient tracking" icon={Boxes} />
          <ModuleCard label="Analytics" description="Revenue, churn, campaign ROI" icon={LineChart} />
        </div>
      </section>
    </div>
  );
}

function ModuleCard({
  href,
  label,
  description,
  icon: Icon,
  enabled = false,
}: {
  href?: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled?: boolean;
}) {
  const inner = (
    <div className="flex h-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition dark:border-gray-800 dark:bg-gray-900">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          enabled
            ? "bg-red-50 text-[#E31E24] dark:bg-red-950/40 dark:text-red-300"
            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {label}
          </h3>
          {!enabled && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Soon
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );

  if (enabled && href) {
    return (
      <Link href={href} className="block hover:shadow-sm">
        {inner}
      </Link>
    );
  }

  return <div aria-disabled className="opacity-70">{inner}</div>;
}
