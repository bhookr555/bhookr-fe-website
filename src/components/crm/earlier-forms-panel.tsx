"use client";

import { useEffect, useMemo } from "react";
import { X, Calendar, User, Phone, Mail, MapPin, CheckCircle2, Clock, Utensils, Award } from "lucide-react";
import type { LeadRow } from "@/lib/crm/leads";
import { formatTimestamp, humanize } from "@/lib/crm/leads";
import { normalizeIndianPhone, normalizeEmail } from "@/app/api/crm/leads/submit/route";

interface EarlierFormsPanelProps {
  open: boolean;
  onClose: () => void;
  lead: LeadRow | null;
  allLeads: LeadRow[];
}

export function EarlierFormsPanel({
  open,
  onClose,
  lead,
  allLeads,
}: EarlierFormsPanelProps) {
  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Find all earlier and related forms submitted by this same person
  const relatedForms = useMemo(() => {
    if (!lead) return [];

    const currentPhone = normalizeIndianPhone(lead.phoneNumber);
    const currentEmail = normalizeEmail(lead.email);
    const isSyntheticEmail = !currentEmail || currentEmail.endsWith("@bhookr.lead");

    const matches = allLeads.filter((item) => {
      // 1. Direct match by session id
      if (lead.sessionId && item.sessionId && lead.sessionId === item.sessionId) {
        return true;
      }
      // 2. Direct match by first_lead_id linkage
      if (lead.firstLeadId && (item.id === lead.firstLeadId || item.firstLeadId === lead.firstLeadId)) {
        return true;
      }
      if (lead.id && item.firstLeadId === lead.id) {
        return true;
      }
      // 3. Match by phone (last 10 digits)
      const itemPhone = normalizeIndianPhone(item.phoneNumber);
      if (currentPhone && currentPhone.length === 10 && itemPhone === currentPhone) {
        return true;
      }
      // 4. Match by email
      const itemEmail = normalizeEmail(item.email);
      if (!isSyntheticEmail && itemEmail && itemEmail === currentEmail) {
        return true;
      }
      return false;
    });

    // Sort newest first
    matches.sort((a, b) => {
      const timeA = typeof a.timestamp === "number" ? a.timestamp : new Date(a.timestamp || 0).getTime();
      const timeB = typeof b.timestamp === "number" ? b.timestamp : new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    return matches;
  }, [lead, allLeads]);

  if (!open || !lead) return null;

  const displayName = lead.name || "Customer";
  const displayPhone = String(lead.phoneNumber || "—");
  const displayEmail = String(lead.email && !lead.email.endsWith("@bhookr.lead") ? lead.email : "—");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md md:max-w-xl bg-white shadow-2xl dark:bg-gray-900 flex flex-col border-l border-gray-200 dark:border-gray-800 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/60 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Earlier forms from this person
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {displayName} • {displayPhone} {displayEmail !== "—" ? `• ${displayEmail}` : ""}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-900/40">
                {relatedForms.length} {relatedForms.length === 1 ? "submission" : "submissions"} on record
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition"
              title="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Submissions List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {relatedForms.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No submissions found for this person.
              </div>
            ) : (
              relatedForms.map((item, idx) => {
                const isSelected = item.sessionId && lead.sessionId ? item.sessionId === lead.sessionId : (item.id && lead.id ? item.id === lead.id : idx === 0);
                const isCompleted = item.formStatus === "completed" || Number(item.lastStepCompleted) >= 8 || Boolean(item.checkoutVisited);
                const stepText = isCompleted ? "Completed" : `Step ${item.lastStepCompleted || 1} of ${item.totalSteps || 9}`;
                const addressFull = [item.address, item.city, item.state, item.pinCode].filter(Boolean).join(", ");

                return (
                  <div
                    key={item.id || item.sessionId || idx}
                    className={`rounded-xl border p-4.5 transition-all ${
                      isSelected
                        ? "border-red-300 bg-red-50/30 dark:border-red-900/60 dark:bg-red-950/20 shadow-xs"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                    }`}
                  >
                    {/* Top Row: Date & Progress */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>Filled on:</span>
                        <strong className="text-gray-700 dark:text-gray-300">
                          {formatTimestamp(item.timestamp)}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="rounded-full bg-red-100 text-[#E31E24] dark:bg-red-950 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            This form
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}
                        >
                          {stepText}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">Name:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{item.name || "—"}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Phone:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{String(item.phoneNumber || "—")}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Email:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {item.email && !item.email.endsWith("@bhookr.lead") ? item.email : "—"}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Goal:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{humanize(item.goal) || "—"}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Diet:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{humanize(item.diet) || "—"}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Food preference:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{humanize(item.foodPreference) || "—"}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Plan:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{item.plan || humanize(item.subscriptionType) || "—"}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Start date:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {item.subscriptionStartDate ? formatTimestamp(item.subscriptionStartDate) : "—"}
                        </p>
                      </div>

                      {addressFull && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Address:</span>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{addressFull}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 transition"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
