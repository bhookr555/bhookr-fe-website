"use client";

import { useMemo, useState } from "react";
import { X, Calendar, Download, FileText, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import {
  calculateReportMetrics,
  generateReportCsv,
  generateReportHtml,
  type AnnotatedLead,
} from "@/lib/crm/report-generator";
import { toast } from "sonner";
import type { CrmRole } from "@/lib/crm/auth";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAnnotatedLeads: AnnotatedLead[];
  todayStr: string;
  role: CrmRole | null;
  initialMode?: "today" | "range";
}

type RangePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "all";

export function ReportModal({
  isOpen,
  onClose,
  allAnnotatedLeads,
  todayStr,
  role,
  initialMode = "today",
}: ReportModalProps) {
  const [reportMode, setReportMode] = useState<"today" | "range">(initialMode);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const applyPreset = (preset: RangePreset) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayFormatted = `${yyyy}-${mm}-${dd}`;

    if (preset === "today") {
      setReportMode("today");
      setStartDate(todayFormatted);
      setEndDate(todayFormatted);
      return;
    }

    setReportMode("range");
    if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0] || "";
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "last7") {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split("T")[0] || "");
      setEndDate(todayFormatted);
    } else if (preset === "last30") {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      setStartDate(d.toISOString().split("T")[0] || "");
      setEndDate(todayFormatted);
    } else if (preset === "thisMonth") {
      const firstDay = `${yyyy}-${mm}-01`;
      setStartDate(firstDay);
      setEndDate(todayFormatted);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const filteredLeads = useMemo(() => {
    if (reportMode === "today") {
      if (!todayStr) return allAnnotatedLeads;
      return allAnnotatedLeads.filter((a) => a.dateKey === todayStr);
    }
    // range mode
    return allAnnotatedLeads.filter((a) => {
      if (!a.dateKey) return false;
      if (startDate && a.dateKey < startDate) return false;
      if (endDate && a.dateKey > endDate) return false;
      return true;
    });
  }, [allAnnotatedLeads, reportMode, todayStr, startDate, endDate]);

  const dateRangeLabel = useMemo(() => {
    if (reportMode === "today") {
      return `Today (${todayStr || "Current Date"})`;
    }
    if (!startDate && !endDate) return "All Time";
    return `${startDate || "Earliest"} to ${endDate || "Latest"}`;
  }, [reportMode, todayStr, startDate, endDate]);

  const metrics = useMemo(() => {
    const title =
      reportMode === "today"
        ? "Today's Sales & Telecaller Performance Report"
        : `Sales Lead Analytics Report (${dateRangeLabel})`;
    return calculateReportMetrics(filteredLeads, dateRangeLabel, title);
  }, [filteredLeads, dateRangeLabel, reportMode]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (filteredLeads.length === 0) {
      toast.error("No leads available for the selected period.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to view/print report.");
      return;
    }

    const html = generateReportHtml(metrics, role || "Admin");
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success("Power BI Visual PDF report opened for download!");
  };

  const handleDownloadCsv = () => {
    if (filteredLeads.length === 0) {
      toast.error("No leads available for the selected period.");
      return;
    }

    const csvStr = generateReportCsv(metrics);
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `bhookr_crm_report_${reportMode}_${new Date().toISOString().split("T")[0] || ""}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Excel CSV report downloaded to local system (${fileName})!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:p-0">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 dark:border-gray-800 dark:from-gray-900 dark:to-gray-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E31E24] text-white shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                BHOOKR CRM Report Generator
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Generate visual Power BI PDF analytics & Excel summaries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 p-6">
          {/* Report Type Switcher */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Select Report Scope
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className={`flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-sm font-semibold transition ${
                  reportMode === "today"
                    ? "border-[#E31E24] bg-red-50/60 text-[#E31E24] ring-2 ring-[#E31E24]/20 dark:bg-red-950/30"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                }`}
              >
                <Calendar className="h-4 w-4" />
                ⚡ Today Report
              </button>

              <button
                type="button"
                onClick={() => setReportMode("range")}
                className={`flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-sm font-semibold transition ${
                  reportMode === "range"
                    ? "border-[#E31E24] bg-red-50/60 text-[#E31E24] ring-2 ring-[#E31E24]/20 dark:bg-red-950/30"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                }`}
              >
                <Calendar className="h-4 w-4" />
                📅 Date Range Report
              </button>
            </div>
          </div>

          {/* Date Range Options & Presets (if range mode) */}
          {reportMode === "range" && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset("yesterday")}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last7")}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last30")}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("thisMonth")}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  This Month
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
                  <span className="text-xs font-medium text-gray-400">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || todayStr}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-gray-900 focus:outline-none dark:text-white"
                  />
                </div>
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
                  <span className="text-xs font-medium text-gray-400">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={todayStr}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-gray-900 focus:outline-none dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Report Preview Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Report Live Summary Preview
              </span>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-[#E31E24] dark:bg-red-950/50">
                {dateRangeLabel}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900">
                <span className="block text-[10px] font-semibold text-gray-400">Total Leads</span>
                <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {metrics.totalLeads}
                </span>
                <span className="block text-[10px] text-gray-500">
                  🌐 {metrics.websiteLeadsCount} · 📑 {metrics.clientFormLeadsCount}
                </span>
              </div>

              <div
                className={`rounded-lg p-2.5 ${
                  metrics.untouchedCount > 0
                    ? "bg-amber-50 text-amber-900 dark:bg-amber-950/30"
                    : "bg-green-50 text-green-900 dark:bg-green-950/30"
                }`}
              >
                <span className="block text-[10px] font-semibold opacity-80">Untouched Leads</span>
                <span className="text-lg font-extrabold">
                  {metrics.untouchedCount}
                </span>
                <span className="block text-[10px] opacity-80">
                  {metrics.untouchedPct}% needs telecall
                </span>
              </div>

              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-900 dark:bg-emerald-950/30">
                <span className="block text-[10px] font-semibold opacity-80">Converted Deals</span>
                <span className="text-lg font-extrabold">{metrics.convertedCount}</span>
                <span className="block text-[10px] opacity-80">
                  {metrics.conversionRatePct}% conv. rate
                </span>
              </div>

              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-900 dark:bg-blue-950/30">
                <span className="block text-[10px] font-semibold opacity-80">Worked Leads</span>
                <span className="text-lg font-extrabold">{metrics.touchedCount}</span>
                <span className="block text-[10px] opacity-80">
                  {metrics.touchedPct}% action rate
                </span>
              </div>
            </div>

            {/* Untouched warning line if any */}
            {metrics.untouchedCount > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Attention: {metrics.untouchedCount} lead(s) are untouched. The downloaded report will list their exact contact names & numbers.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Download Actions */}
        <div className="flex flex-col gap-2.5 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <FileText className="h-4 w-4 text-emerald-600" />
            Download Excel (CSV)
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E31E24] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#c8161b]"
          >
            <Download className="h-4 w-4" />
            Download Power BI PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}
