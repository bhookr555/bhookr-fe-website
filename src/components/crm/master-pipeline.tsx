"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  formatTimestamp,
  humanize,
  type LeadRow,
  type LeadsApiResponse,
} from "@/lib/crm/leads";
import {
  type SubscriptionRow,
  type SubscriptionsApiResponse,
} from "@/lib/crm/subscriptions";
import {
  PIPELINE_CHANGED_EVENT,
  PIPELINE_STATUSES,
  effectiveStatus,
  getStatusMeta,
  fetchPipelineApi,
  setPipelineStatusApi,
  type PipelineMap,
  type PipelineStatus,
} from "@/lib/crm/pipeline";
import { getCurrentRole, type CrmRole } from "@/lib/crm/auth";
import { ConvertModal } from "@/components/crm/convert-modal";
import { ReportModal } from "@/components/crm/report-modal";
import { type AnnotatedLead } from "@/lib/crm/report-generator";

const REFRESH_INTERVAL_MS = 60_000;

type SortBy = "newest" | "oldest" | "name";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

type DateFilter = "today" | "all" | "range";

function tsValue(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** YYYY-MM-DD in the local timezone */
function localDateString(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function MasterPipeline() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [role, setRole] = useState<CrmRole | null>(null);
  const [filter, setFilter] = useState<PipelineStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const [dateMode, setDateMode] = useState<DateFilter>("today");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");

  const [exportOpen, setExportOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportInitialMode, setReportInitialMode] = useState<"today" | "range">("today");

  const [convertingLead, setConvertingLead] = useState<{
    email: string;
    name: string;
  } | null>(null);

  type LeadSourceFilter = "all" | "website" | "client_form";
  const [sourceFilter, setSourceFilter] = useState<LeadSourceFilter>("all");

  const fetchAll = useCallback(async (silent = false, force = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const leadsUrl = force ? "/api/crm/leads?refresh=true" : "/api/crm/leads";
      const clientFormUrl = force ? "/api/crm/client-form?refresh=true" : "/api/crm/client-form";
      const subsUrl = force ? "/api/crm/subscriptions?refresh=true" : "/api/crm/subscriptions";

      const [leadsRes, clientFormRes, subsRes, pipelineData] = await Promise.all([
        fetch(leadsUrl, { cache: "no-store" }),
        fetch(clientFormUrl, { cache: "no-store" }).catch(() => null),
        fetch(subsUrl, { cache: "no-store" }),
        fetchPipelineApi(),
      ]);

      const leadsData = (await leadsRes.json()) as LeadsApiResponse;
      const clientFormData = clientFormRes && clientFormRes.ok ? await clientFormRes.json() : null;
      const subsData = (await subsRes.json()) as SubscriptionsApiResponse;

      if (!leadsRes.ok || !leadsData.success) {
        throw new Error(leadsData.error || "Leads request failed");
      }

      const websiteRows: LeadRow[] = Array.isArray(leadsData.rows)
        ? leadsData.rows.map((r) => ({ ...r, leadSource: "website" }))
        : [];

      const clientFormRows: LeadRow[] = clientFormData && clientFormData.success && Array.isArray(clientFormData.rows)
        ? clientFormData.rows.map((r: any) => ({ ...r, leadSource: "client_form" }))
        : [];

      setLeads([...websiteRows, ...clientFormRows]);
      setSubs(subsData.success && Array.isArray(subsData.rows) ? subsData.rows : []);
      setPipeline(pipelineData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setRole(getCurrentRole());
    fetchAll();
    setTodayStr(localDateString(new Date()));

    const handler = () => {
      fetchPipelineApi().then(setPipeline);
    };
    window.addEventListener(PIPELINE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PIPELINE_CHANGED_EVENT, handler);
  }, [fetchAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAll(true);
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const verifiedEmails = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) {
      if (String(s.paymentStatus ?? "").toLowerCase() === "success") {
        set.add(String(s.email ?? "").toLowerCase().trim());
      }
    }
    return set;
  }, [subs]);

  const annotatedLeads = useMemo(() => {
    return leads.map((lead) => {
      const eff = effectiveStatus(String(lead.email ?? ""), pipeline, verifiedEmails);
      return {
        lead,
        status: eff.status,
        source: eff.source,
        dateKey: localDateString(lead.timestamp),
      };
    });
  }, [leads, pipeline, verifiedEmails]);

  // Apply date filter first so chip counts reflect the date window.
  const dateFilteredLeads = useMemo(() => {
    if (dateMode === "all") return annotatedLeads;
    if (dateMode === "today") {
      if (!todayStr) return annotatedLeads;
      return annotatedLeads.filter((a) => a.dateKey === todayStr);
    }
    if (dateMode === "range") {
      return annotatedLeads.filter((a) => {
        if (!a.dateKey) return false;
        if (startDate && a.dateKey < startDate) return false;
        if (endDate && a.dateKey > endDate) return false;
        return true;
      });
    }
    return annotatedLeads;
  }, [annotatedLeads, dateMode, todayStr, startDate, endDate]);

  const counts = useMemo(() => {
    const map: Record<PipelineStatus | "all", number> = {
      all: dateFilteredLeads.length,
      new: 0,
      pending: 0,
      follow_up: 0,
      trial_requested: 0,
      hot_prospect: 0,
      future_prospect: 0,
      converted: 0,
      sale_rejected: 0,
    };
    for (const a of dateFilteredLeads) map[a.status]++;
    return map;
  }, [dateFilteredLeads]);

  const visible = useMemo(() => {
    const matching = dateFilteredLeads.filter((a) => {
      if (sourceFilter !== "all" && (a.lead.leadSource || "website") !== sourceFilter) return false;
      if (filter !== "all" && a.status !== filter) return false;
      if (search.trim()) {
        const haystack = [a.lead.name, a.lead.email, a.lead.phoneNumber]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });

    const sorted = [...matching];
    if (sortBy === "newest") {
      sorted.sort((a, b) => tsValue(b.lead.timestamp) - tsValue(a.lead.timestamp));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => tsValue(a.lead.timestamp) - tsValue(b.lead.timestamp));
    } else if (sortBy === "name") {
      sorted.sort((a, b) =>
        String(a.lead.name ?? "").localeCompare(String(b.lead.name ?? ""), "en", { sensitivity: "base" })
      );
    }
    return sorted;
  }, [dateFilteredLeads, filter, search, sortBy, sourceFilter]);

  const handleStatusChange = async (email: string, name: string, newStatus: PipelineStatus) => {
    if (!role) return;
    if (newStatus === "converted") {
      // Use the rich modal for converted so we can capture plan / amount / method
      setConvertingLead({ email, name });
      return;
    }
    const success = await setPipelineStatusApi(email, newStatus, role);
    if (success) {
      const meta = getStatusMeta(newStatus);
      toast.success(`${meta.icon} Moved to ${meta.label}`, {
        description: name || email,
      });
    } else {
      toast.error("Failed to update status in the database");
    }
  };

  const exportToCsv = () => {
    if (visible.length === 0) {
      toast.error("No leads available to export");
      return;
    }

    const headers = [
      "No.",
      "Name",
      "Email",
      "Phone Number",
      "Plan Interest",
      "Status",
      "Timestamp",
      "Subscription Type",
      "Plan",
      "Checkout Visited",
      "Last Step Completed",
    ];

    const rows = visible.map((item, idx) => {
      return [
        idx + 1,
        item.lead.name || "",
        item.lead.email || "",
        item.lead.phoneNumber || "",
        item.lead.subscriptionType || "",
        item.status,
        item.lead.timestamp ? new Date(item.lead.timestamp).toLocaleString("en-IN") : "",
        item.lead.subscriptionType || "",
        item.lead.plan || "",
        item.lead.checkoutVisited !== undefined ? String(item.lead.checkoutVisited) : "",
        item.lead.lastStepCompleted !== undefined ? String(item.lead.lastStepCompleted) : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) => {
            const strVal = String(val);
            return `"${strVal.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bhookr_leads_${dateMode}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  const exportToPdf = () => {
    if (visible.length === 0) {
      toast.error("No leads available to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to view/print PDF.");
      return;
    }

    const dateRangeStr =
      dateMode === "today"
        ? `Today (${todayStr})`
        : dateMode === "range"
        ? `${startDate || "any"} to ${endDate || "any"}`
        : "All time";

    const rowsHtml = visible
      .map(
        (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.lead.name || "—"}</strong></td>
        <td>${item.lead.email || "—"}</td>
        <td>${item.lead.phoneNumber || "—"}</td>
        <td>${humanize(item.lead.subscriptionType) || "—"}${item.lead.plan ? ` (${item.lead.plan})` : ""}</td>
        <td>${formatTimestamp(item.lead.timestamp)}</td>
        <td><span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span></td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BHOOKR CRM Leads Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            margin: 40px 30px;
            font-size: 13px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e31e24;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .brand {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #e31e24;
            text-transform: uppercase;
          }
          .brand span {
            color: #333333;
            font-weight: 400;
          }
          .report-info {
            text-align: right;
            font-size: 11px;
            color: #666;
          }
          .title {
            font-size: 18px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 5px;
            color: #111;
          }
          .filters-summary {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 10px 15px;
            margin-bottom: 20px;
            display: flex;
            gap: 20px;
            font-size: 12px;
          }
          .filters-summary div strong {
            color: #495057;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f1f3f5;
            color: #495057;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #dee2e6;
            padding: 8px 10px;
            text-align: left;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #dee2e6;
            font-size: 11px;
            vertical-align: top;
          }
          tr:nth-child(even) td {
            background-color: #fafbfe;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.3px;
          }
          .status-new { background-color: #e0f2fe; color: #0369a1; }
          .status-follow_up { background-color: #e0e7ff; color: #4338ca; }
          .status-trial_requested { background-color: #f3e8ff; color: #6b21a8; }
          .status-hot_prospect { background-color: #ffedd5; color: #c2410c; }
          .status-future_prospect { background-color: #ccfbf1; color: #0f766e; }
          .status-converted { background-color: #dcfce7; color: #15803d; }
          .status-sale_rejected { background-color: #fee2e2; color: #b91c1c; }
          
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">BHOOKR <span>CRM</span></div>
            <div class="report-info" style="text-align: left; margin-top: 3px;">Fresh Meal Subscriptions</div>
          </div>
          <div class="report-info">
            <div>Generated: ${new Date().toLocaleString("en-IN")}</div>
            <div>Staff Role: ${role || "admin"}</div>
          </div>
        </div>

        <div class="title">Leads Report</div>
        <div class="filters-summary">
          <div><strong>Date Filter:</strong> ${dateRangeStr}</div>
          <div><strong>Status Filter:</strong> ${filter === "all" ? "All Statuses" : filter.toUpperCase()}</div>
          <div><strong>Leads Found:</strong> ${visible.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%">#</th>
              <th style="width: 20%">Name</th>
              <th style="width: 20%">Email</th>
              <th style="width: 15%">Phone</th>
              <th style="width: 15%">Plan Interest</th>
              <th style="width: 15%">Captured Date</th>
              <th style="width: 10%">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const dateModeLabel: Record<DateFilter, string> = {
    today: "Today",
    all: "All time",
    range: "Date range",
  };

  const dateEmptyReason =
    dateMode === "today" && dateFilteredLeads.length === 0
      ? `No leads captured today (${todayStr}). Try "All time" or pick a date range.`
      : dateMode === "range" && (startDate || endDate) && dateFilteredLeads.length === 0
      ? `No leads between ${startDate || "any"} and ${endDate || "any"}.`
      : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Master pipeline
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {loading
              ? "Loading…"
              : `${visible.length} of ${dateFilteredLeads.length} leads`}
          </h2>
          {!loading && (
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {dateModeLabel[dateMode]}
              {dateMode === "range" && (startDate || endDate) ? ` · ${startDate || "any"} to ${endDate || "any"}` : ""}
              {" · "}status changes save to database · last updated{" "}
              {lastUpdated?.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => fetchAll(false, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E31E24]/30 bg-red-50/50 px-3.5 py-2 text-sm font-semibold text-[#E31E24] shadow-sm transition hover:bg-red-100/60 dark:border-[#E31E24]/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <BarChart3 className="h-4 w-4" />
              Reports & Export
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
            
            {exportOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-gray-800 dark:bg-gray-950 z-50">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Lead Reports & Analytics
                  </div>
                  <button
                    onClick={() => {
                      setReportInitialMode("today");
                      setReportModalOpen(true);
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-red-50 hover:text-[#E31E24] dark:text-gray-200 dark:hover:bg-red-950/40"
                  >
                    ⚡ 1. Today Report
                  </button>
                  <button
                    onClick={() => {
                      setReportInitialMode("range");
                      setReportModalOpen(true);
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-red-50 hover:text-[#E31E24] dark:text-gray-200 dark:hover:bg-red-950/40"
                  >
                    📅 2. Date Range Report
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                  <button
                    onClick={() => {
                      exportToCsv();
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    📄 Export Raw CSV (Excel)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Lead Source Switcher */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Source:
        </span>
        <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setSourceFilter("all")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              sourceFilter === "all"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            📂 All Sources
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("website")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              sourceFilter === "website"
                ? "bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            🌐 Website Leads
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("client_form")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              sourceFilter === "client_form"
                ? "bg-white text-purple-700 shadow-sm dark:bg-gray-900 dark:text-purple-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            📑 Client Form
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={counts.all}
          pill="bg-gray-900 text-white dark:bg-white dark:text-gray-900"
          inactivePill="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
        {PIPELINE_STATUSES.map((s) => (
          <FilterChip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            icon={s.icon}
            label={s.shortLabel}
            count={counts[s.value]}
            pill={s.pill}
            inactivePill="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
        ))}
      </div>

      {/* Search + Date + Sort */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-950 dark:text-white sm:max-w-sm"
        />

        <select
          value={dateMode}
          onChange={(e) => setDateMode(e.target.value as DateFilter)}
          aria-label="Date filter"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-950 dark:text-white"
        >
          <option value="today">📅 Today&apos;s leads</option>
          <option value="all">📅 All time</option>
          <option value="range">📅 Date range…</option>
        </select>

        {dateMode === "range" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs text-gray-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                max={endDate || todayStr}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs text-gray-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayStr}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label="Sort by"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-950 dark:text-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50 dark:bg-gray-950">
            <tr>
              <Th>#</Th>
              <Th>Name</Th>
              <Th>Contact</Th>
              <Th>Plan interest</Th>
              <Th>Captured</Th>
              <Th>Status</Th>
              <Th align="right">View</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500">
                  Loading leads from Google Sheet…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500">
                  {dateEmptyReason ?? "No leads match this filter."}
                </td>
              </tr>
            ) : (
              visible.map((a, idx) => {
                const emailKey = String(a.lead.email ?? "").toLowerCase().trim();
                const meta = getStatusMeta(a.status);
                const href = `/crm/leads/${encodeURIComponent(emailKey)}`;
                const isOnlineConverted = a.status === "converted" && a.source === "online";

                return (
                  <tr
                    key={`${emailKey}-${idx}`}
                    className="border-t border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:border-gray-800 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20"
                  >
                    <Td className="text-xs text-gray-400">{idx + 1}</Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={href}
                          className="font-medium text-gray-900 hover:text-[#E31E24] hover:underline dark:text-white"
                        >
                          {a.lead.name || "—"}
                        </Link>
                        {a.lead.leadSource === "client_form" ? (
                          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.2 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                            📑 Client Form
                          </span>
                        ) : (
                          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            🌐 Website Lead
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        <div className="truncate max-w-[200px]">{a.lead.email}</div>
                        <div>{String(a.lead.phoneNumber ?? "—")}</div>
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        <div>{humanize(a.lead.subscriptionType) || "—"}</div>
                        <div className="text-gray-400">{String(a.lead.plan ?? "")}</div>
                      </div>
                    </Td>
                    <Td className="text-xs text-gray-600 dark:text-gray-300">
                      {formatTimestamp(a.lead.timestamp)}
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}
                        >
                          <span>{meta.icon}</span>
                          {meta.shortLabel}
                        </span>
                        {isOnlineConverted ? (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            via Razorpay
                          </span>
                        ) : (
                          role && role !== "auditor" && (
                            <select
                              value={a.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  emailKey,
                                  String(a.lead.name ?? ""),
                                  e.target.value as PipelineStatus
                                )
                              }
                              className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                            >
                              {PIPELINE_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.icon} {s.shortLabel}
                                </option>
                              ))}
                            </select>
                          )
                        )}
                      </div>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href="https://dashboard.razorpay.com/app/invoices"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                          title="Open Razorpay Invoices Dashboard"
                        >
                          💳 Invoice
                        </a>
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Open <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {convertingLead && (
        <ConvertModal
          email={convertingLead.email}
          name={convertingLead.name}
          role={role}
          onClose={() => setConvertingLead(null)}
          onSuccess={() => {
            toast.success("✅ Marked as converted", {
              description: convertingLead.name || convertingLead.email,
            });
          }}
        />
      )}

      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          allAnnotatedLeads={annotatedLeads as AnnotatedLead[]}
          todayStr={todayStr}
          role={role}
          initialMode={reportInitialMode}
        />
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
  count,
  pill,
  inactivePill,
}: {
  active: boolean;
  onClick: () => void;
  icon?: string;
  label: string;
  count: number;
  pill: string;
  inactivePill: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
        active ? pill : inactivePill
      }`}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
          active ? "bg-white/20" : "bg-white/60 dark:bg-gray-900/60"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-gray-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-200 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
