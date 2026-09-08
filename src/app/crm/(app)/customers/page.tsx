"use client";

import { useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Users, ShieldCheck, IndianRupee, StickyNote, Printer } from "lucide-react";
import {
  aggregateByCustomer,
  formatINR,
  type CustomerAggregate,
  type SubscriptionRow,
} from "@/lib/crm/subscriptions";
import { formatTimestamp, humanize, tsValue } from "@/lib/crm/leads";
import { NoteModal } from "@/components/crm/note-modal";
import { ThermalReceiptModal, type ReceiptData } from "@/components/crm/thermal-receipt-modal";
import { useActiveCustomers, useSubscriptions, usePipelineData, useRefreshDashboard } from "@/hooks/crm/use-dashboard-data";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { PipelineTableSkeleton } from "@/components/crm/skeletons";

type SortBy = "recent" | "spent-high" | "spent-low" | "name" | "count";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "spent-high", label: "Spent: high → low" },
  { value: "spent-low", label: "Spent: low → high" },
  { value: "count", label: "Subscriptions count" },
  { value: "name", label: "Name A–Z" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active Subscribers" },
  { value: "all", label: "All Customers" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function statusBadge(status: string): React.ReactNode {
  const s = String(status || "").toLowerCase();
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    expired: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${styles[s] ?? styles.expired}`}
    >
      {humanize(s) || "—"}
    </span>
  );
}

interface MappedCustomerRow {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  location: string;
  city: string;
  currentStatus: string;
  subscriptionCount: number;
  totalSpent: number;
  latestPlan: string;
  mealType: string;
  meal: string;
  goal: string;
  customizations: string;
  inspection: string;
  latestPaidAt: string;
  rawRow?: Record<string, any>;
}

function normalizeCustomSheetRows(rows: Record<string, any>[]): MappedCustomerRow[] {
  return rows.map((r, idx) => {
    const id = r.Id || r.id || r["Id"] || r["ID"] || `PS${String(idx + 1).padStart(5, "0")}`;
    const name =
      r.name || r.Customer || r.customerName || r["Customer Name"] || r["CUSTOMER"] || r["name"] || `Customer #${idx + 1}`;
    const phone =
      r["phone number"] || r.Phone || r.Mobile || r.phoneNumber || r.customerPhone || r["Phone"] || r["Mobile"] || "—";
    const location = r.location || r.Address || r.address || r["location"] || "—";
    const zone = r.zone || r.City || r.deliveryCity || r.city || r["zone"] || r["Zone"] || "lb nagar";
    const status = r.Status || r.status || r.paymentStatus || r["Status"] || "Active";
    const plan = r.Plan || r.plan || r.latestPlan || r.subscriptionType || r["Plan"] || "elite";
    const type = r.Type || r.type || r["Type"] || "veg";
    const meal = r.Meal || r.meal || r["Meal"] || "bf";
    const goal = r.goal || r.Goal || r["goal"] || "fitness";
    const customizations = r.Customizations || r.customizations || r["Customizations"] || "none";
    const inspection = r.Inspection || r.inspection || r["Inspection"] || "done";
    
    const email =
      r.Email || r.customerEmail || r.email || r["Email"] || `${String(name).toLowerCase().replace(/\s+/g, "")}@bhookr.com`;

    const rawSpent =
      r["TOTAL"] ?? r["Total Spent"] ?? r.totalSpent ?? r.amountPaid ?? r.grandTotal ?? r.subtotal ?? r.total ?? 606.90;
    const spentNum =
      typeof rawSpent === "number" ? rawSpent : parseFloat(String(rawSpent).replace(/[^0-9.]/g, "")) || 606.90;

    return {
      id: String(id),
      email: String(email),
      name: String(name),
      phoneNumber: String(phone),
      location: String(location),
      city: String(zone),
      currentStatus: String(status || "Active"),
      subscriptionCount: 1,
      totalSpent: Number.isFinite(spentNum) ? spentNum : 606.90,
      latestPlan: String(plan),
      mealType: String(type),
      meal: String(meal),
      goal: String(goal),
      customizations: String(customizations),
      inspection: String(inspection),
      latestPaidAt: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
      rawRow: r,
    };
  });
}

const SAMPLE_SHEET_ROWS = [
  {
    Id: "PS00001",
    name: "Shiva",
    "phone number": "8186939526",
    location: "idly street",
    zone: "lb nagar",
    Status: "Priority / Active",
    Plan: "elite",
    Type: "veg",
    Meal: "bf",
    goal: "weight loss",
    Customizations: "yes",
    Inspection: "done",
    "Items Total": "578.00",
    "GST (5%)": "28.90",
    DeliveryFee: "99.00",
    TOTAL: "606.90",
  },
];

export default function CrmActiveCustomersDashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  const debouncedSearch = useDebounce(search, 300);

  const {
    data: activeCustomersRes,
    isLoading: loading,
    isError,
    error: dashError,
    isFetching: refreshing,
    dataUpdatedAt,
  } = useActiveCustomers();

  const { data: pipelineData } = usePipelineData();
  const refreshMutation = useRefreshDashboard();

  const [noteModalLead, setNoteModalLead] = useState<{
    email: string;
    name?: string;
    notes?: string;
    noteHistory?: import("@/lib/crm/pipeline").NoteHistoryEntry[];
  } | null>(null);

  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  const pipeline = useMemo(() => pipelineData?.data ?? {}, [pipelineData]);
  const lastUpdated = useMemo(() => (dataUpdatedAt ? new Date(dataUpdatedAt) : null), [dataUpdatedAt]);

  const customers = useMemo<MappedCustomerRow[]>(() => {
    if (activeCustomersRes?.rows && Array.isArray(activeCustomersRes.rows) && activeCustomersRes.rows.length > 0) {
      return normalizeCustomSheetRows(activeCustomersRes.rows);
    }
    return normalizeCustomSheetRows(SAMPLE_SHEET_ROWS);
  }, [activeCustomersRes]);

  const filtered = useMemo(() => {
    const matching = customers.filter((c) => {
      if (statusFilter !== "all" && c.currentStatus.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (debouncedSearch.trim()) {
        const haystack = [c.id, c.name, c.phoneNumber, c.location, c.city, c.latestPlan, c.mealType, c.meal, c.goal]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(debouncedSearch.trim().toLowerCase())) return false;
      }
      return true;
    });

    const sorted = [...matching];
    if (sortBy === "recent") sorted.sort((a, b) => tsValue(b.latestPaidAt) - tsValue(a.latestPaidAt));
    else if (sortBy === "spent-high") sorted.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sortBy === "spent-low") sorted.sort((a, b) => a.totalSpent - b.totalSpent);
    else if (sortBy === "count") sorted.sort((a, b) => b.subscriptionCount - a.subscriptionCount);
    else if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    return sorted;
  }, [customers, debouncedSearch, statusFilter, sortBy]);

  const totalActiveRevenue = useMemo(
    () => customers.reduce((sum, c) => sum + c.totalSpent, 0),
    [customers]
  );

  const handleOpenReceipt = (c: MappedCustomerRow) => {
    const raw = c.rawRow || {};

    const customerName = c.name || "Shiva";
    const mobile = c.phoneNumber || "8186939526";
    const deliveryDate = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
    const orderType = `${c.mealType.toUpperCase()} (${c.meal.toUpperCase()})`;
    const deliveryZone = `${c.city.toUpperCase()} (${c.location})`;
    const orderId = c.id || "PS00001";
    
    const itemsTotal = raw["Items Total"] ? Number(raw["Items Total"]) : 578.00;
    const gstAmount = raw["GST (5%)"] ? Number(raw["GST (5%)"]) : 28.90;
    const deliveryFee = raw.DeliveryFee ? Number(raw.DeliveryFee) : 99.00;
    const totalVal = c.totalSpent > 0 ? c.totalSpent : 606.90;

    const receipt: ReceiptData = {
      customerName: String(customerName),
      mobile: String(mobile),
      deliveryDate: String(deliveryDate),
      type: String(orderType),
      items: [
        {
          name: `${c.latestPlan.toUpperCase()} — ${c.meal.toUpperCase()}`,
          subtitle: `Goal: ${c.goal} | Type: ${c.mealType}`,
          qty: 1,
          price: itemsTotal,
        },
      ],
      itemsTotal: itemsTotal,
      gstAmount: gstAmount,
      deliveryFee: deliveryFee,
      total: totalVal,
      amountPaid: totalVal,
      dueAmount: 0.00,
      deliveryZone: String(deliveryZone),
      orderId: String(orderId),
      recipeCodes: [`CUSTOM: ${c.customizations}`, `INSPEC: ${c.inspection}`],
    };

    setActiveReceipt(receipt);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Customer Management
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Active Customers Dashboard
          </h1>
          {!loading && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Tracking active meal subscribers & print sheet orders · updated{" "}
              {lastUpdated?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={() =>
            refreshMutation.mutate(undefined, {
              onSuccess: () => toast.success("Customers refreshed"),
              onError: () => toast.error("Refresh failed — using cached data"),
            })
          }
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Subscribers</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? "…" : customers.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Customer Base</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? "…" : customers.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Revenue</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? "…" : formatINR(totalActiveRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {isError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <p className="font-semibold text-red-900 dark:text-red-200">
              Couldn&apos;t load active customers
            </p>
            <p className="mt-0.5 text-red-800 dark:text-red-300/80">{dashError?.message}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ID, name, phone, location, plan, goal…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white sm:max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {STATUS_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {SORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>Sort: {opt.label}</option>))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "100px" }}>ID</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "140px" }}>Name</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "130px" }}>Phone</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "130px" }}>Location</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "110px" }}>Zone</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "90px" }}>Status</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "90px" }}>Plan</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "80px" }}>Type</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "80px" }}>Meal</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "120px" }}>Goal</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "110px" }}>Print Bill</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "90px" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="p-0"><PipelineTableSkeleton rows={6} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="px-3 py-12 text-center text-sm text-gray-500">
                  {customers.length === 0 ? "No active sheet orders found." : "No entries match your filters."}
                </td></tr>
              ) : (
                filtered.map((c, idx) => {
                  const emailKey = c.email.toLowerCase().trim();
                  const note = pipeline[emailKey]?.notes;
                  return (
                    <tr key={c.id + idx} className="odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20">
                      <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs font-semibold text-[#E31E24] dark:border-gray-800">{c.id}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 font-medium text-gray-900 dark:border-gray-800 dark:text-white">{c.name}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{c.phoneNumber}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{c.location}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{c.city}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 dark:border-gray-800">{statusBadge(c.currentStatus)}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 font-medium text-gray-900 dark:border-gray-800 dark:text-white capitalize">{c.latestPlan}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200 capitalize">{c.mealType}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200 uppercase">{c.meal}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200 capitalize">{c.goal}</td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-center dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(c)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#E31E24]/30 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#E31E24] hover:bg-[#E31E24] hover:text-white transition dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white shadow-xs"
                          title="Print Thermal Receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </button>
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-right dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() =>
                            setNoteModalLead({
                              email: c.email,
                              name: c.name,
                              notes: note || "",
                              noteHistory: pipeline[emailKey]?.noteHistory ?? [],
                            })
                          }
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                            note
                              ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60"
                              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                          title={note ? `Note: ${note}` : "Add / Edit Note"}
                        >
                          <StickyNote className="h-3.5 w-3.5" />
                          {note ? "Note" : "Note"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {noteModalLead && (
        <NoteModal
          isOpen={!!noteModalLead}
          email={noteModalLead.email}
          name={noteModalLead.name}
          initialNotes={noteModalLead.notes}
          noteHistory={noteModalLead.noteHistory ?? []}
          onClose={() => setNoteModalLead(null)}
        />
      )}

      {/* Thermal Receipt Print Modal */}
      <ThermalReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        receipt={activeReceipt}
      />
    </div>
  );
}

