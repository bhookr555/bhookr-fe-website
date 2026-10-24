/**
 * CRM Dashboard — TanStack Query Hooks
 *
 * WHY a single hook for all dashboard data:
 * - All CRM widgets share the same query key → data fetched ONCE, shared everywhere
 * - The Analytics page, Orders page, and Dashboard all reuse the cached result
 * - Navigating between pages shows data instantly from React Query's in-memory cache
 *
 * DATA FLOW:
 * 1. First mount: fires GET /api/crm/dashboard → Firestore cache hit → <300ms
 * 2. Subsequent mounts within staleTime (2min): zero network request
 * 3. After staleTime: background refetch while old data stays visible (no spinner)
 * 4. On status change: invalidateQueries triggers a background refresh
 */

"use client";

import { useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { LeadRow } from "@/lib/crm/leads";
import type { SubscriptionRow } from "@/lib/crm/subscriptions";
import type { OrderRow } from "@/lib/crm/orders";
import { loadPipeline, type PipelineMap } from "@/lib/crm/pipeline";

// ── Query Keys ────────────────────────────────────────────────────────────────
// Centralised so all invalidation calls use the same keys
export const CRM_QUERY_KEYS = {
  dashboard: ["crm", "dashboard"] as const,
  pipeline: ["crm", "pipeline"] as const,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GasDataSlice<T> {
  success: boolean;
  rows: T[];
  total: number;
  error?: string;
}

export interface DashboardResponse {
  success: boolean;
  leads: GasDataSlice<LeadRow>;
  clientForm: GasDataSlice<LeadRow>;
  subscriptions: GasDataSlice<SubscriptionRow>;
  orders: GasDataSlice<OrderRow>;
  meta: {
    cachedAt: string;
    source: "firestore-cache" | "gas";
    errors?: Record<string, string>;
  };
}

export interface PipelineResponse {
  success: boolean;
  data: PipelineMap;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDashboard(forceRefresh = false): Promise<DashboardResponse> {
  const url = forceRefresh ? "/api/crm/dashboard?refresh=true" : "/api/crm/dashboard";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Dashboard fetch failed: ${res.status}`);
  }
  return res.json();
}

async function fetchPipeline(): Promise<PipelineResponse> {
  try {
    const res = await fetch(`/api/crm/pipeline?t=${Date.now()}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const fallback = typeof window !== "undefined" ? loadPipeline() : {};
      return { success: true, data: fallback };
    }
    const body = await res.json();
    const serverMap: PipelineMap = body?.success && body?.pipeline ? body.pipeline : {};
    return { success: true, data: serverMap };
  } catch (err) {
    console.warn("[fetchPipeline] API fetch failed, using fallback:", err);
    const fallback = typeof window !== "undefined" ? loadPipeline() : {};
    return { success: true, data: fallback };
  }
}


// ── Primary Hook: all dashboard data ─────────────────────────────────────────

// Purge all legacy versioned cache keys from localStorage
if (typeof window !== "undefined") {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("bhookr_crm_dash_cache"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * The primary hook for all CRM data. All widgets mount this hook — React Query
 * deduplicates the fetch so only one network request is made regardless of how
 * many components mount simultaneously.
 *
 * initialData: reads from localStorage → renders IMMEDIATELY on frame 1 (0ms)
 * placeholderData: keepPreviousData → when a forceRefresh is triggered, the old
 * data stays visible while the new fetch runs. No loading flash.
 */
export function useDashboardData() {
  const queryClient = useQueryClient();

  // ── Supabase Realtime Subscription ──────────────────────────────────────────
  // Subscribes directly to postgres_changes on 'leads' and 'subscriptions'.
  // Whenever any user submits a lead anywhere, this event triggers immediately.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;
    const channelName = `crm-dash-realtime-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("[useDashboardData] Realtime leads event:", payload.eventType, payload.new);
          // Invalidate immediately to fetch fresh canonical list without delay
          queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.dashboard });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        (payload) => {
          console.log("[useDashboardData] Realtime subscriptions event:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.dashboard });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("[useDashboardData] Realtime orders event:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.dashboard });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        (payload) => {
          console.log("[useDashboardData] Realtime customers event:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["crm", "active-customers-sheet-v9"] });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("[useDashboardData] Realtime subscription notice:", err.message);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [queryClient]);

  const query = useQuery<DashboardResponse, Error>({
    queryKey: CRM_QUERY_KEYS.dashboard,
    queryFn: () => fetchDashboard(false),
    staleTime: 5 * 1000,              // 5s: refresh quickly when leads arrive
    gcTime: 10 * 60 * 1000,           // 10 min: keep in memory across navigations
    refetchInterval: 10 * 1000,       // 10s: reliable background synchronization
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,        // Refresh instantly when staff returns to CRM tab
    refetchOnReconnect: true,          // Refresh instantly when network reconnects
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 10_000),
    placeholderData: keepPreviousData,    // No flash between refreshes
  });

  return query;
}

// ── Pipeline Hook ─────────────────────────────────────────────────────────────

/**
 * Pipeline is user-editable state (statuses, notes, history).
 * We subscribe to realtime updates and refetch every 4 seconds in the background
 * so changes by one telecaller/admin appear for everyone within seconds without manual refresh.
 */
export function usePipelineData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let unsubscribeFirestore: (() => void) | undefined;
    let cancelled = false;

    // Dynamically import Firestore client listener if configured
    import("@/lib/firebase/config").then(({ db, isFirebaseConfigured }) => {
      if (cancelled || !isFirebaseConfigured || !db) return;
      try {
        import("firebase/firestore").then(({ collection, onSnapshot }) => {
          if (cancelled) return;
          const colRef = collection(db, "crm_pipeline");
          unsubscribeFirestore = onSnapshot(
            colRef,
            (snapshot) => {
              const pipeline: PipelineMap = {};
              snapshot.docs.forEach((doc) => {
                const data = doc.data();
                pipeline[doc.id] = {
                  email: doc.id,
                  leadId: data.leadId,
                  status: data.status,
                  updatedAt: data.updatedAt,
                  updatedBy: data.updatedBy,
                  notes: data.notes,
                  noteHistory: data.noteHistory ?? [],
                  statusHistory: data.statusHistory ?? [],
                  planType: data.planType,
                  amount: data.amount,
                  paymentMethod: data.paymentMethod,
                };
              });
              queryClient.setQueryData(CRM_QUERY_KEYS.pipeline, {
                success: true,
                data: pipeline,
              });
            },
            (error) => {
              console.warn("[usePipelineData] Firestore onSnapshot warning:", error.message);
            }
          );
        });
      } catch (err) {
        console.warn("[usePipelineData] Realtime listener setup error:", err);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [queryClient]);

  return useQuery<PipelineResponse, Error>({
    queryKey: CRM_QUERY_KEYS.pipeline,
    queryFn: fetchPipeline,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 4000, // Background poll every 4s to ensure fast multi-user sync
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });
}

// ── Derived Selectors ─────────────────────────────────────────────────────────
// Use these in sub-pages that only need one data slice to avoid re-renders
// when unrelated data changes.

export function useLeads() {
  return useQuery<DashboardResponse, Error, GasDataSlice<LeadRow>>({
    queryKey: CRM_QUERY_KEYS.dashboard,
    queryFn: () => fetchDashboard(false),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    select: (data) => data.leads,
  });
}

export function useSubscriptions() {
  return useQuery<DashboardResponse, Error, GasDataSlice<SubscriptionRow>>({
    queryKey: CRM_QUERY_KEYS.dashboard,
    queryFn: () => fetchDashboard(false),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    select: (data) => data.subscriptions,
  });
}

export function useOrders() {
  return useQuery<DashboardResponse, Error, GasDataSlice<OrderRow>>({
    queryKey: CRM_QUERY_KEYS.dashboard,
    queryFn: () => fetchDashboard(false),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    select: (data) => data.orders,
  });
}

export function useActiveCustomers() {
  return useQuery<{ success: boolean; rows: Record<string, any>[]; total: number }, Error>({
    queryKey: ["crm", "active-customers-sheet-v9"],
    queryFn: async () => {
      const res = await fetch(`/api/crm/customers?t=${Date.now()}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch active customers sheet: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 5 * 1000, // Instant sync: auto-refetch every 5 seconds
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

// ── Manual Refresh Mutation ───────────────────────────────────────────────────

/**
 * Used by the "Refresh" button in MasterPipeline.
 * Bypasses cache on both server (refresh=true param) and client (invalidate).
 *
 * WHY a mutation: it's a user action with loading state, not a background fetch.
 * The onSuccess invalidates the query so all subscribed components update.
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Wipe all browser localStorage cache keys FIRST so stale/ghost data never re-appears
      if (typeof window !== "undefined") {
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("bhookr_crm_dash_cache"))
            .forEach((k) => localStorage.removeItem(k));
        } catch {
          // ignore
        }
      }
      // Remove stale TanStack Query cache so it re-fetches from server
      queryClient.removeQueries({ queryKey: CRM_QUERY_KEYS.dashboard });
      // Now force-refresh from server (bypasses Firestore cache too via ?refresh=true)
      return fetchDashboard(true);
    },
    onSuccess: (data) => {
      // Seed the cache with the fresh data immediately (no extra fetch)
      queryClient.setQueryData<DashboardResponse>(CRM_QUERY_KEYS.dashboard, data);
    },
    onError: (err) => {
      console.error("[useRefreshDashboard] Force refresh failed:", err);
    },
  });
}


/**
 * Invalidate dashboard after a pipeline status change so all widgets
 * that show pipeline-derived data (e.g., status badges) update reactively.
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.pipeline });
  };
}
