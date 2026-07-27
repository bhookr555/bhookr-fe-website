"use client";

import { useEffect, useState } from "react";
import { MasterPipeline } from "@/components/crm/master-pipeline";
import { getCurrentRole, getRoleMeta, type CrmRole } from "@/lib/crm/auth";
import { TrendingUp, Users, Flame, CheckCircle2 } from "lucide-react";

export default function CrmSalesDashboardPage() {
  const [role, setRole] = useState<CrmRole | null>(null);

  useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  const meta = role ? getRoleMeta(role) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 p-5 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/60 sm:flex-row sm:items-center sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E31E24]/10 px-2.5 py-0.5 text-xs font-bold text-[#E31E24]">
              <TrendingUp className="h-3.5 w-3.5" /> Sales Command Center
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">
            Sales Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Real-time sales lead pipeline, conversion rates, and deal tracking.
          </p>
        </div>

        {meta && (
          <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/80">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Staff Identity
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {meta.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {meta.description}
            </p>
          </div>
        )}
      </div>

      {/* Main Lead Pipeline */}
      <MasterPipeline />
    </div>
  );
}
