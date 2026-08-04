"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react";
import {
  formatTimestamp,
  humanize,
  type LeadRow,
} from "@/lib/crm/leads";
import {
  formatINR,
  type SubscriptionRow,
} from "@/lib/crm/subscriptions";
import { getCurrentRole, type CrmRole } from "@/lib/crm/auth";
import {
  PIPELINE_STATUSES,
  effectiveStatus,
  getStatusMeta,
  setPipelineStatusApi,
  removePipelineEntryApi,
  type PipelineEntry,
  type PipelineMap,
  type PipelineStatus,
} from "@/lib/crm/pipeline";
import { ConvertModal } from "@/components/crm/convert-modal";
import { NoteModal } from "@/components/crm/note-modal";
import { useDashboardData, usePipelineData, useRefreshDashboard } from "@/hooks/crm/use-dashboard-data";
import { toast } from "sonner";


function Field({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
        {value === null || value === undefined || value === "" ? (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ email: string }>();
  const rawEmail = decodeURIComponent(String(params?.email ?? ""));
  const email = rawEmail.toLowerCase().trim();

  // Role initialization (synchronous)
  const role = useMemo<CrmRole | null>(() => {
    if (typeof window === "undefined") return null;
    return getCurrentRole();
  }, []);

  // React Query: instant load from in-memory cache
  const {
    data: dashData,
    isLoading: loading,
    isError,
    error: dashError,
    isFetching: refreshing,
  } = useDashboardData();

  const { data: pipelineData } = usePipelineData();
  const refreshMutation = useRefreshDashboard();

  const [convertOpen, setConvertOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Derive lead & subscriptions from shared React Query cache
  const allLeads = useMemo<LeadRow[]>(() => {
    if (!dashData) return [];
    const websiteLeads = Array.isArray(dashData.leads?.rows)
      ? dashData.leads.rows.map((r) => ({ ...r, leadSource: "website" as const }))
      : [];
    const clientFormLeads = Array.isArray(dashData.clientForm?.rows)
      ? dashData.clientForm.rows.map((r: LeadRow) => ({ ...r, leadSource: "client_form" as const }))
      : [];
    return [...websiteLeads, ...clientFormLeads];
  }, [dashData]);

  const allSubs = useMemo<SubscriptionRow[]>(() => {
    if (!dashData?.subscriptions?.rows) return [];
    return Array.isArray(dashData.subscriptions.rows) ? dashData.subscriptions.rows : [];
  }, [dashData]);

  const lead = useMemo(() => {
    return allLeads.find((l) => String(l.email ?? "").toLowerCase().trim() === email) ?? null;
  }, [allLeads, email]);

  const matchedSubs = useMemo(() => {
    return allSubs.filter((s) => String(s.email ?? "").toLowerCase().trim() === email);
  }, [allSubs, email]);

  const pipelineEntry = useMemo(() => {
    return pipelineData?.data?.[email] ?? null;
  }, [pipelineData, email]);

  const error = dashError?.message || actionError;


  const isAdmin = role === "admin";

  const verifiedSub = useMemo(() => {
    const successful = matchedSubs.filter(
      (s) => String(s.paymentStatus ?? "").toLowerCase() === "success"
    );
    if (successful.length === 0) return null;
    return successful.reduce((latest, s) => {
      const t1 = new Date(latest.timestamp as string).getTime();
      const t2 = new Date(s.timestamp as string).getTime();
      return t2 > t1 ? s : latest;
    });
  }, [matchedSubs]);

  const verifiedEmailSet = useMemo(
    () => new Set(verifiedSub ? [email] : []),
    [email, verifiedSub]
  );

  const eff = useMemo(() => {
    const localMap: PipelineMap = pipelineEntry ? { [email]: pipelineEntry } : {};
    return effectiveStatus(email, localMap, verifiedEmailSet);
  }, [email, verifiedEmailSet, pipelineEntry]);
  const effMeta = getStatusMeta(eff.status);

  const handleStatusChange = async (newStatus: PipelineStatus) => {
    if (!role) return;
    if (newStatus === "converted") {
      setConvertOpen(true);
      return;
    }
    const success = await setPipelineStatusApi(email, newStatus, role);
    if (!success) {
      setActionError("Failed to update status in the database");
    } else {
      toast.success(`Status updated to ${newStatus}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500">Loading lead…</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/crm/leads"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
          <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
            Lead not found
          </h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/80">
            No lead exists with email <strong>{email}</strong>. It may have been
            removed from the sheet, or the URL is wrong.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/crm/dashboard"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Pipeline
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {lead.name || <span className="text-gray-400">No name</span>}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${effMeta.pill}`}
            >
              <span>{effMeta.icon}</span>
              {effMeta.label}
            </span>
            {lead.leadSource === "client_form" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                📑 Client Form
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                🌐 Website Lead
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Lead since {formatTimestamp(lead.timestamp)} · Step{" "}
            {String(lead.lastStepCompleted ?? "—")} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNoteOpen(true)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              pipelineEntry?.notes
                ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            <StickyNote className="h-4 w-4" />
            {pipelineEntry?.notes ? "Edit Notes" : "Add Notes"}
          </button>
          {role && role !== "auditor" && eff.source !== "online" && (
            <select
              value={eff.status}
              onChange={(e) => handleStatusChange(e.target.value as PipelineStatus)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {PIPELINE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() =>
              refreshMutation.mutate(undefined, {
                onSuccess: () => toast.success("Lead details refreshed"),
                onError: () => toast.error("Refresh failed"),
              })
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Conversion status banner */}
      {verifiedSub ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                ✅ Converted via online payment
              </h3>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300/90">
                This lead has a successful payment on record in the
                Subscriptions sheet — no manual action needed.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Plan" value={humanize(String(verifiedSub.subscriptionType ?? ""))} />
                <Stat label="Amount" value={formatINR(verifiedSub.amountPaid)} />
                <Stat label="Paid on" value={formatTimestamp(verifiedSub.timestamp)} />
                <Stat label="Method" value={humanize(verifiedSub.paymentMethod) || "—"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/crm/customers"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  View in Customers →
                </Link>
                <Link
                  href="/crm/subscriptions"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  See all {matchedSubs.length} subscription
                  {matchedSubs.length > 1 ? "s" : ""} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : pipelineEntry?.status === "converted" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-4">
            <Sparkles className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                Marked converted manually (database record)
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">
                This mark is saved in your central CRM database. It does not
                exist in the Subscriptions sheet yet. Use the website&apos;s payment flow for a real payment conversion.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Plan" value={humanize(pipelineEntry.planType ?? "") || "—"} />
                <Stat
                  label="Amount"
                  value={pipelineEntry.amount ? formatINR(pipelineEntry.amount) : "—"}
                />
                <Stat
                  label="Method"
                  value={humanize(pipelineEntry.paymentMethod ?? "") || "—"}
                />
                <Stat label="Marked on" value={formatTimestamp(pipelineEntry.updatedAt)} />
              </div>
              {pipelineEntry.notes && (
                <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-xs italic text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  &ldquo;{pipelineEntry.notes}&rdquo;
                </p>
              )}
              {isAdmin && (
                <button
                  onClick={async () => {
                    if (confirm("Remove the conversion mark for this lead?")) {
                      const success = await removePipelineEntryApi(email);
                      if (!success) {
                        setActionError("Failed to remove conversion mark from database");
                      }
                    }
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove mark
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-4">
            <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-gray-400" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Current status: {effMeta.label}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {effMeta.description}. Use the status dropdown above to change,
                or hit Convert if this customer just paid offline.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setConvertOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as converted
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <SectionCard title="Contact">
        <Field icon={Mail} label="Email" value={lead.email} />
        <Field icon={Phone} label="Phone" value={String(lead.phoneNumber ?? "")} />
        <Field icon={Calendar} label="Captured" value={formatTimestamp(lead.timestamp)} />
      </SectionCard>

      <SectionCard title="Profile">
        <Field icon={User} label="Gender" value={humanize(lead.gender)} />
        <Field label="Age" value={lead.age ? `${lead.age}` : ""} />
        <Field label="Height" value={lead.height ? `${lead.height} cm` : ""} />
        <Field label="Weight" value={lead.weight ? `${lead.weight} kg` : ""} />
        <Field label="Activity" value={humanize(lead.physicalState)} />
      </SectionCard>

      <SectionCard title="Goals & diet">
        <Field label="Goal" value={humanize(lead.goal)} />
        <Field label="Diet" value={humanize(lead.diet)} />
        <Field label="Food preference" value={humanize(lead.foodPreference)} />
        {lead.foodLove && <Field label="Food favorites" value={lead.foodLove} />}
      </SectionCard>

      <SectionCard title="Plan interest">
        <Field label="Plan type" value={humanize(lead.subscriptionType)} />
        <Field label="Meals" value={lead.plan} />
        <Field label="Start date" value={formatTimestamp(lead.subscriptionStartDate)} />
        <Field
          label="Reached checkout"
          value={
            lead.checkoutVisited === true ||
            lead.checkoutVisited === "true" ||
            lead.checkoutVisited === "TRUE" ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Yes
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                No
              </span>
            )
          }
        />
        <Field label="Last step completed" value={String(lead.lastStepCompleted ?? "")} />
        <Field label="Sheet status" value={humanize(lead.status)} />
      </SectionCard>

      {/* Telecaller Notes Card */}
      <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Telecaller & Staff Notes
            </h2>
          </div>
          <button
            onClick={() => setNoteOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100/50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            {pipelineEntry?.notes ? "Edit Note" : "+ Add Note"}
          </button>
        </div>
        <div className="mt-3">
          {pipelineEntry?.notes ? (
            <p className="whitespace-pre-wrap rounded-lg border border-amber-200/60 bg-white p-3 text-sm text-gray-800 dark:border-amber-900/40 dark:bg-gray-900 dark:text-gray-200">
              {pipelineEntry.notes}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              No notes written for this lead yet. Click &quot;Add Note&quot; to write call status, follow-up times, or customer requests.
            </p>
          )}
        </div>
      </section>

      <p className="text-xs text-gray-400">
        Read-only view of the sheet data. The Google Sheets are not modified by
        anything on this page. Pipeline status + conversion marks + notes are saved in the central CRM database.
      </p>

      {convertOpen && (
        <ConvertModal
          email={email}
          name={String(lead.name ?? "")}
          role={role}
          onClose={() => setConvertOpen(false)}
        />
      )}

      {noteOpen && (
        <NoteModal
          isOpen={noteOpen}
          email={email}
          name={String(lead.name ?? "")}
          initialNotes={pipelineEntry?.notes || ""}
          currentStatus={eff.status}
          onClose={() => setNoteOpen(false)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
