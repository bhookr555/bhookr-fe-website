"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, RotateCcw, Save, ShieldAlert } from "lucide-react";
import { CRM_ROLES, getCurrentRole, type CrmRole } from "@/lib/crm/auth";
import {
  CRM_MODULES,
  DEFAULT_PERMISSIONS,
  PERMISSION_OPTIONS,
  type PermissionLevel,
  type PermissionMatrix,
  loadPermissions,
  resetPermissions,
  savePermissions,
} from "@/lib/crm/permissions";

const LEVEL_STYLES: Record<PermissionLevel, string> = {
  none: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  read: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  write: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function CrmSettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<CrmRole | null>(null);
  const [ready, setReady] = useState(false);

  const [matrix, setMatrix] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);
  const [original, setOriginal] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);
  const [saved, setSaved] = useState(false);

  // Gate access to admin only.
  useEffect(() => {
    const current = getCurrentRole();
    if (!current) {
      router.replace("/crm");
      return;
    }
    setRole(current);
    const loaded = loadPermissions();
    setMatrix(loaded);
    setOriginal(loaded);
    setReady(true);
  }, [router]);

  const isAdmin = role === "admin";

  const dirty = useMemo(
    () => JSON.stringify(matrix) !== JSON.stringify(original),
    [matrix, original]
  );

  const updateCell = useCallback(
    (targetRole: CrmRole, module: string, value: PermissionLevel) => {
      setSaved(false);
      setMatrix((prev) => ({
        ...prev,
        [targetRole]: {
          ...prev[targetRole],
          [module]: value,
        },
      }));
    },
    []
  );

  const handleSave = useCallback(() => {
    savePermissions(matrix);
    setOriginal(matrix);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [matrix]);

  const handleReset = useCallback(() => {
    if (!confirm("Reset all permissions back to defaults? This cannot be undone.")) return;
    resetPermissions();
    setMatrix(DEFAULT_PERMISSIONS);
    setOriginal(DEFAULT_PERMISSIONS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Access denied
            </h2>
            <p className="mt-1 text-sm text-red-800 dark:text-red-300/80">
              Only the Admin role can change CRM permissions. You are signed in
              as <strong className="capitalize">{role}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Settings
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            Role permissions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose what each role can see and do across the CRM. Saved per
            browser for the prototype.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4" />
            Reset defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E31E24] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41E3A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          ✓ Permissions saved. Changes take effect on next page load.
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-900">
        <span className="font-semibold text-gray-600 dark:text-gray-400">Levels:</span>
        {PERMISSION_OPTIONS.map((opt) => (
          <span
            key={opt.value}
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${LEVEL_STYLES[opt.value]}`}
          >
            <strong>{opt.label}</strong>
            <span className="opacity-70">— {opt.description}</span>
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <Lock className="h-3.5 w-3.5" />
          You can lock yourself out — be careful with the <strong>admin</strong> row.
        </span>
      </div>

      {/* Role sections */}
      <div className="space-y-5">
        {CRM_ROLES.map((roleMeta) => (
          <section
            key={roleMeta.value}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-950">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {roleMeta.label}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {roleMeta.description}
                </p>
              </div>
              {roleMeta.value === "admin" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <Lock className="h-3 w-3" />
                  This is your role
                </span>
              )}
            </header>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {CRM_MODULES.map((mod) => {
                const value = matrix[roleMeta.value][mod.id];
                return (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {mod.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${LEVEL_STYLES[value]}`}
                      >
                        {PERMISSION_OPTIONS.find((o) => o.value === value)?.label}
                      </span>
                    </div>
                    <select
                      value={value}
                      onChange={(e) =>
                        updateCell(roleMeta.value, mod.id, e.target.value as PermissionLevel)
                      }
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    >
                      {PERMISSION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Prototype: settings are stored in this browser only. They&apos;ll move
        to a real backend in Phase 2.
      </p>
    </div>
  );
}
