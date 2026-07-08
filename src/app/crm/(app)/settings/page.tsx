"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  RotateCcw,
  Save,
  ShieldAlert,
  Users,
  Key,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  Loader2,
} from "lucide-react";
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

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: CrmRole;
  createdAt?: string;
  lastLogin?: string;
}

type SettingsTab = "staff" | "permissions" | "security";

export default function CrmSettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<CrmRole | null>(null);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("staff");

  // Permissions Matrix State
  const [matrix, setMatrix] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);
  const [original, setOriginal] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);
  const [saved, setSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Staff Management State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [showResetModal, setShowResetModal] = useState<StaffUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<CrmRole>("telecaller");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffConfirmPassword, setNewStaffConfirmPassword] = useState("");

  const [resetUserPassword, setResetUserPassword] = useState("");
  const [resetUserConfirmPassword, setResetUserConfirmPassword] = useState("");

  // Change self password state
  const [selfNewPassword, setSelfNewPassword] = useState("");
  const [selfConfirmPassword, setSelfConfirmPassword] = useState("");
  const [changingSelfPassword, setChangingSelfPassword] = useState(false);

  const isAdmin = role === "admin";

  // Load configuration
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch("/api/crm/auth/users");
      const data = await res.json();
      if (res.ok && data.success) {
        setStaffList(data.users || []);
      } else {
        console.error("Failed to load staff list:", data.error);
      }
    } catch (err) {
      console.error("Error loading staff:", err);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    const current = getCurrentRole();
    if (!current) {
      router.replace("/crm");
      return;
    }
    setRole(current);
    
    // Non-admins can only access the Security tab to change their own password
    if (current !== "admin") {
      setActiveTab("security");
    }

    const loaded = loadPermissions();
    setMatrix(loaded);
    setOriginal(loaded);
    setReady(true);
    
    if (current === "admin") {
      fetchStaff();
    }
  }, [router, fetchStaff]);

  const dirty = useMemo(
    () => JSON.stringify(matrix) !== JSON.stringify(original),
    [matrix, original]
  );

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

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

  const handleSavePermissions = useCallback(() => {
    savePermissions(matrix);
    setOriginal(matrix);
    showStatus("success", "✓ Permissions saved. Changes take effect on next reload.");
  }, [matrix]);

  const handleResetPermissions = useCallback(() => {
    if (!confirm("Reset all permissions back to defaults? This cannot be undone.")) return;
    resetPermissions();
    setMatrix(DEFAULT_PERMISSIONS);
    setOriginal(DEFAULT_PERMISSIONS);
    showStatus("success", "✓ Permissions reset to system defaults.");
  }, []);

  // Create Staff Account
  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    if (newStaffPassword !== newStaffConfirmPassword) {
      showStatus("error", "Passwords do not match.");
      return;
    }
    if (newStaffPassword.length < 6) {
      showStatus("error", "Password must be at least 6 characters long.");
      return;
    }

    setLoadingStaff(true);
    try {
      const res = await fetch("/api/crm/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: newStaffEmail,
          name: newStaffName,
          role: newStaffRole,
          password: newStaffPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus("success", `✓ Staff member ${newStaffEmail} created successfully.`);
        setIsAddingStaff(false);
        setNewStaffEmail("");
        setNewStaffName("");
        setNewStaffPassword("");
        setNewStaffConfirmPassword("");
        fetchStaff();
      } else {
        showStatus("error", data.error || "Failed to create staff member.");
      }
    } catch (err) {
      showStatus("error", "An error occurred while creating staff.");
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Delete Staff Account
  const handleDeleteStaff = async (userId: string, email: string) => {
    if (!confirm(`Are you absolutely sure you want to delete ${email}? They will instantly lose access.`)) return;

    setLoadingStaff(true);
    try {
      const res = await fetch("/api/crm/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          userId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus("success", `✓ Staff user deleted.`);
        fetchStaff();
      } else {
        showStatus("error", data.error || "Failed to delete user.");
      }
    } catch (err) {
      showStatus("error", "An error occurred.");
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Reset Password for User
  const handleResetUserPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;

    if (resetUserPassword !== resetUserConfirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (resetUserPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoadingStaff(true);
    try {
      const res = await fetch("/api/crm/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          userId: showResetModal.id,
          newPassword: resetUserPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus("success", `✓ Password reset for ${showResetModal.email}.`);
        setShowResetModal(null);
        setResetUserPassword("");
        setResetUserConfirmPassword("");
      } else {
        showStatus("error", data.error || "Failed to reset password.");
      }
    } catch (err) {
      showStatus("error", "An error occurred.");
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Change Self Password
  const handleChangeSelfPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (selfNewPassword !== selfConfirmPassword) {
      showStatus("error", "Passwords do not match.");
      return;
    }
    if (selfNewPassword.length < 6) {
      showStatus("error", "Password must be at least 6 characters.");
      return;
    }

    setChangingSelfPassword(true);
    try {
      const res = await fetch("/api/crm/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-self-password",
          newPassword: selfNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus("success", "✓ Your password has been changed successfully.");
        setSelfNewPassword("");
        setSelfConfirmPassword("");
      } else {
        showStatus("error", data.error || "Failed to update password.");
      }
    } catch (err) {
      showStatus("error", "An error occurred.");
      console.error(err);
    } finally {
      setChangingSelfPassword(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Banner Navigation (Tabs) */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
              CRM Settings
            </p>
            <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
              System Administration
            </h1>
          </div>
        </div>

        {/* Tab Headers */}
        <nav className="flex space-x-4 -mb-px">
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("staff")}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  activeTab === "staff"
                    ? "border-[#E31E24] text-[#E31E24]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <Users className="h-4 w-4" />
                Staff Directory
              </button>

              <button
                onClick={() => setActiveTab("permissions")}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  activeTab === "permissions"
                    ? "border-[#E31E24] text-[#E31E24]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Role Permissions
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              activeTab === "security"
                ? "border-[#E31E24] text-[#E31E24]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Key className="h-4 w-4" />
            Security & Password
          </button>
        </nav>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm transition-all duration-300 ${
            statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. STAFF DIRECTORY TAB (Admin only)                     */}
      {/* ======================================================== */}
      {activeTab === "staff" && isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Staff Users</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create accounts, assign roles, and overwrite passwords for your staff members.
              </p>
            </div>
            {!isAddingStaff && (
              <button
                onClick={() => setIsAddingStaff(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E31E24] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41E3A]"
              >
                <Plus className="h-4 w-4" />
                Add Staff Member
              </button>
            )}
          </div>

          {/* Add Staff form */}
          {isAddingStaff && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Create New Account</h3>
              <form onSubmit={handleCreateStaff} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="e.g. rahul@bhookr.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Access Role
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as CrmRole)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  >
                    {CRM_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} — {r.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Confirm
                    </label>
                    <input
                      type="password"
                      required
                      value={newStaffConfirmPassword}
                      onChange={(e) => setNewStaffConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsAddingStaff(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingStaff}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#E31E24] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#C41E3A] disabled:opacity-50"
                  >
                    {loadingStaff && <Loader2 className="h-3 w-3 animate-spin" />}
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User List */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {loadingStaff && staffList.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center p-4">
                <p className="text-sm font-semibold text-gray-500">No staff members found.</p>
                <p className="text-xs text-gray-400">Add user accounts above to populate directory.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                      <th className="px-6 py-3">Full Name</th>
                      <th className="px-6 py-3">Email Address</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {staffList.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                          {u.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              u.role === "admin"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                                : u.role === "manager"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                : u.role === "telecaller"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-850/40 dark:text-gray-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => setShowResetModal(u)}
                              className="text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-gray-800 rounded px-2 py-1 transition hover:bg-gray-50 dark:hover:bg-gray-850"
                            >
                              Reset PW
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(u.id, u.email)}
                              disabled={u.email === "admin@bhookr.com" || u.id === "mock-admin"}
                              className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:pointer-events-none p-1 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reset PW Modal */}
          {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Reset Password for:
                </h3>
                <p className="text-xs text-[#E31E24] font-semibold mb-4">{showResetModal.email}</p>
                <form onSubmit={handleResetUserPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={resetUserPassword}
                      onChange={(e) => setResetUserPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={resetUserConfirmPassword}
                      onChange={(e) => setResetUserConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetModal(null);
                        setResetUserPassword("");
                        setResetUserConfirmPassword("");
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#E31E24] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#C41E3A]"
                    >
                      Overwrite Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ROLE PERMISSIONS MATRIX TAB (Admin only)             */}
      {/* ======================================================== */}
      {activeTab === "permissions" && isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Permissions configuration</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose what each role can see and do across the CRM. Saves to browser storage.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetPermissions}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RotateCcw className="h-4 w-4" />
                Reset defaults
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={!dirty}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E31E24] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41E3A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </div>

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
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">{roleMeta.label}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{roleMeta.description}</p>
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
                      <div key={mod.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{mod.label}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${LEVEL_STYLES[value]}`}>
                            {PERMISSION_OPTIONS.find((o) => o.value === value)?.label}
                          </span>
                        </div>
                        <select
                          value={value}
                          onChange={(e) => updateCell(roleMeta.value, mod.id, e.target.value as PermissionLevel)}
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SECURITY & CHANGE PASSWORD TAB (All Staff)           */}
      {/* ======================================================== */}
      {activeTab === "security" && (
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-[#E31E24]/10 p-2.5 text-[#E31E24]">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Update your account password. Choose a strong, unique value.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangeSelfPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={selfNewPassword}
                    onChange={(e) => setSelfNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={selfConfirmPassword}
                  onChange={(e) => setSelfConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#E31E24] focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  type="submit"
                  disabled={changingSelfPassword}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E31E24] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41E3A] disabled:opacity-50"
                >
                  {changingSelfPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
