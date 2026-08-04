"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CrmSidebar } from "@/components/crm/sidebar";
import { CrmTopbar } from "@/components/crm/topbar";
import { getCurrentRole, type CrmRole } from "@/lib/crm/auth";

/**
 * WHY the old code was slow:
 * The previous implementation used useEffect + setState to read the role,
 * causing a full render cycle: blank "Loading…" screen → role check → render.
 * On fast devices this is one frame; on slow connections it's noticeable.
 *
 * FIX: useState lazy initializer runs synchronously during the first render.
 * The sidebar and topbar render on the FIRST paint, not the second.
 * typeof window guard handles SSR (though this is "use client" only).
 */
export default function CrmAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Synchronous read — no useEffect, no blank intermediate render
  const role = useMemo<CrmRole | null>(() => {
    if (typeof window === "undefined") return null;
    return getCurrentRole();
  }, []);

  if (!role) {
    // Redirect happens synchronously on client — use effect only for the push
    if (typeof window !== "undefined") {
      router.replace("/crm");
    }
    // Show nothing during redirect (avoids layout flash with wrong role)
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <CrmSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopbar role={role} />
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
