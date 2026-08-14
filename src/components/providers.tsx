"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { useEffect, useState } from "react";
import { captureUtms } from "@/lib/utm";

/**
 * WHY these specific values:
 *
 * staleTime: 2min — React Query considers data "fresh" for 2 minutes.
 *   Any component mounting within this window gets data instantly from cache
 *   with zero network request. Only after 2min does it background-refetch.
 *
 * gcTime: 10min — Keeps query results in memory for 10 minutes after all
 *   subscribers unmount (navigating away from dashboard). When the user
 *   navigates back, data renders immediately from garbage-collected cache.
 *
 * retry: 2 — GAS can transiently fail. Retry twice with exponential backoff
 *   before surfacing an error to the user.
 *
 * refetchOnWindowFocus: true — CRM staff switch between tabs/apps frequently.
 *   When they return to the CRM tab, stale data is background-refreshed
 *   automatically without any spinner or manual refresh click.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    captureUtms();
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,    // 2 minutes: instant load from cache
            gcTime: 10 * 60 * 1000,      // 10 minutes: keep in memory across navigations
            refetchOnWindowFocus: true,   // refresh when staff returns to CRM tab
            retry: 2,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 10_000), // 1s, 2s, max 10s
          },
        },
      })
  );

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <WhatsAppButton />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
