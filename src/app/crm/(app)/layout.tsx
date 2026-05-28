"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrmSidebar } from "@/components/crm/sidebar";
import { CrmTopbar } from "@/components/crm/topbar";
import { getCurrentRole, type CrmRole } from "@/lib/crm/auth";

export default function CrmAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<CrmRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getCurrentRole();
    if (!current) {
      router.replace("/crm");
      return;
    }
    setRole(current);
    setReady(true);
  }, [router]);

  if (!ready || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <CrmSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopbar role={role} />
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
