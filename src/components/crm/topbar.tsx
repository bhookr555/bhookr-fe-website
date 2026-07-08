"use client";

import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { type CrmRole, getRoleMeta, logoutCrm } from "@/lib/crm/auth";

interface CrmTopbarProps {
  role: CrmRole;
}

export function CrmTopbar({ role }: CrmTopbarProps) {
  const router = useRouter();
  const meta = getRoleMeta(role);

  const handleLogout = async () => {
    await logoutCrm();
    router.replace("/crm");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
      <div className="hidden flex-1 max-w-md md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            disabled
            placeholder="Search (coming soon)"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {meta?.label ?? role}
          </span>
          {meta?.readOnly && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Read-only
            </span>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
