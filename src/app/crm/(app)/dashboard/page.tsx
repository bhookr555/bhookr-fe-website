"use client";

import { useEffect, useState } from "react";
import { MasterPipeline } from "@/components/crm/master-pipeline";
import { getCurrentRole, getRoleMeta, type CrmRole } from "@/lib/crm/auth";

export default function CrmDashboardPage() {
  const [role, setRole] = useState<CrmRole | null>(null);

  useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  const meta = role ? getRoleMeta(role) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <MasterPipeline />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Signed in as
        </p>
        <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
          {meta?.label ?? role ?? "—"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {meta?.description ?? ""}
        </p>
      </div>
    </div>
  );
}
