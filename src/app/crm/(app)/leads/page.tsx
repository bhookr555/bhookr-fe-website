"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Download, Plus } from "lucide-react";
import { SAMPLE_LEADS, LEAD_COLUMNS, type LeadRow } from "@/lib/crm/sample-leads";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "lead", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "hot", label: "Hot" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

function formatTimestamp(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderCell(row: LeadRow, key: keyof LeadRow): React.ReactNode {
  const value = row[key];

  if (key === "timestamp" || key === "subscriptionStartDate") {
    return formatTimestamp(String(value ?? ""));
  }

  if (key === "checkoutVisited") {
    return value ? (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        No
      </span>
    );
  }

  if (key === "status") {
    const status = String(value || "lead").toLowerCase();
    const styles: Record<string, string> = {
      lead: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
      contacted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
      hot: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
      converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
      lost: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
          styles[status] ?? styles.lead
        }`}
      >
        {status}
      </span>
    );
  }

  return value === null || value === undefined || value === "" ? (
    <span className="text-gray-300 dark:text-gray-600">—</span>
  ) : (
    String(value)
  );
}

export default function CrmLeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return SAMPLE_LEADS.filter((row) => {
      if (statusFilter !== "all" && String(row.status).toLowerCase() !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const haystack = [row.name, row.email, row.phoneNumber]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Sample data banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Showing sample leads
          </p>
          <p className="mt-0.5 text-amber-800 dark:text-amber-300/80">
            The table layout is final, but rows below are placeholders. Real
            leads will appear here once the Google Sheet read endpoint is
            connected.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Leads
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            {filtered.length} of {SAMPLE_LEADS.length} leads
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-500"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white sm:max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  #
                </th>
                {LEAD_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={LEAD_COLUMNS.length + 1}
                    className="px-3 py-12 text-center text-sm text-gray-500"
                  >
                    No leads match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr
                    key={`${row.email}-${idx}`}
                    className="odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20"
                  >
                    <td className="border-b border-gray-100 px-3 py-2 text-xs text-gray-400 dark:border-gray-800">
                      {idx + 1}
                    </td>
                    {LEAD_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200"
                      >
                        {renderCell(row, col.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
