"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CRM_ROLES,
  CRM_DEMO_PASSWORD,
  loginAs,
  type CrmRole,
} from "@/lib/crm/auth";

export default function CrmLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<CrmRole>("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== CRM_DEMO_PASSWORD) {
      setError("Incorrect password");
      return;
    }

    setSubmitting(true);
    loginAs(role);
    router.push("/crm/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative h-12 w-32 mb-4">
            <Image
              src="/finalred.png"
              alt="BHOOKR"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CRM Login
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Staff access only
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="role"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as CrmRole)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={submitting}
              >
                {CRM_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={submitting}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#E31E24] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41E3A] active:bg-[#A01828] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-gray-400 dark:text-gray-500">
            Prototype build — temporary shared password.
          </p>
        </form>
      </div>
    </main>
  );
}
