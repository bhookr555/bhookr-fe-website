"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import {
  CRM_ROLES,
  CRM_DEMO_PASSWORD,
  loginAs,
  getCurrentRole,
  type CrmRole,
} from "@/lib/crm/auth";

export default function CrmLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<CrmRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const forceBypass = false; // Disable local bypass mode

  // If already logged in, redirect directly to dashboard
  useEffect(() => {
    const currentRole = getCurrentRole();
    if (currentRole) {
      router.push("/crm/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isFirebaseConfigured && !forceBypass) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          const token = await user.getIdToken();

          const res = await fetch("/api/crm/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            await signOut(auth);
            throw new Error(data.error || "Access denied: Insufficient permissions.");
          }

          loginAs(data.role as CrmRole);
          router.push("/crm/dashboard");
          return;
        } catch (clientErr: any) {
          // If client-side network failed (e.g. adblocker, corporate firewall, DNS),
          // fallback seamlessly to server-side login endpoint
          if (
            clientErr.code === "auth/network-request-failed" ||
            clientErr.message?.includes("network-request-failed")
          ) {
            console.warn("[CRM Auth] Client network failed, falling back to server-side login...");
            const serverRes = await fetch("/api/crm/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });

            const serverData = await serverRes.json();
            if (serverRes.ok && serverData.success) {
              loginAs(serverData.role as CrmRole);
              router.push("/crm/dashboard");
              return;
            }
            throw new Error(serverData.error || "Authentication failed. Please check credentials.");
          }
          throw clientErr;
        }
      } else {
        // Fallback: Local Development Bypass
        if (password !== CRM_DEMO_PASSWORD) {
          throw new Error("Incorrect password");
        }

        loginAs(role);
        router.push("/crm/dashboard");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      let errMsg = err.message || "An unexpected error occurred during sign in.";
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        errMsg = "Invalid email or password. Please try again.";
      }
      setError(errMsg);
      setSubmitting(false);
    }
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
            {(!isFirebaseConfigured || forceBypass) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                ⚠️ <strong>Development Bypass Mode Active:</strong> Firebase configuration bypassed. Select a role and enter default credentials to log in.
              </div>
            )}

            {isFirebaseConfigured && !forceBypass ? (
              // Secure Form for Production / Staging with Firebase Auth
              <>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={submitting}
                    required
                  />
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
              </>
            ) : (
              // Bypass Form for Local Development
              <>
                <div>
                  <label
                    htmlFor="role"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Role (Dev Bypass)
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
                    Bypass Password
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
              </>
            )}

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
            {isFirebaseConfigured
              ? "Secure enterprise authentication enabled."
              : "Prototype build — temporary shared bypass password."}
          </p>
        </form>
      </div>
    </main>
  );
}
