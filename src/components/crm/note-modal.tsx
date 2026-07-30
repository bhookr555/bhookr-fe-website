"use client";

import { useEffect, useState } from "react";
import { StickyNote, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentRole, type CrmRole } from "@/lib/crm/auth";
import { saveLeadNoteApi, type PipelineStatus } from "@/lib/crm/pipeline";

interface NoteModalProps {
  isOpen: boolean;
  email: string;
  name?: string;
  initialNotes?: string;
  currentStatus?: PipelineStatus;
  onClose: () => void;
  onSuccess?: (newNotes: string) => void;
}

export function NoteModal({
  isOpen,
  email,
  name,
  initialNotes = "",
  currentStatus = "new",
  onClose,
  onSuccess,
}: NoteModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes, isOpen]);

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const role: CrmRole = getCurrentRole() || "admin";
      await saveLeadNoteApi(email, notes, role, currentStatus);
      toast.success("Notes saved successfully", {
        description: name || email,
      });
      if (onSuccess) onSuccess(notes);
      onClose();
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        // Close modal when clicking on the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <StickyNote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {name ? `Notes: ${name}` : "Lead Notes"}
              </h3>
              <p className="max-w-[240px] truncate text-xs text-gray-500 dark:text-gray-400">
                {email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Telecaller / Customer Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Write notes about this lead... (e.g., 'Asked to call me tomorrow', 'Prefers dinner meal delivery')"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:bg-gray-950"
          />
          <p className="text-[11px] text-gray-400">
            Notes are saved instantly to the database and synced across your CRM staff devices.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E31E24] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Done
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
