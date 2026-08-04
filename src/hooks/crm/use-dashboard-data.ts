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

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { LeadRow } from "@/lib/crm/leads";
import type { SubscriptionRow } from "@/lib/crm/subscriptions";
import type { OrderRow } from "@/lib/crm/orders";
import type { PipelineMap } from "@/lib/crm/pipeline";

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
  const res = await fetch("/api/crm/pipeline", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Pipeline fetch failed: ${res.status}`);
  }
  return res.json();
}

// ── Primary Hook: all dashboard data ─────────────────────────────────────────

/**
 * The primary hook for all CRM data. All widgets mount this hook — React Query
 * deduplicates the fetch so only one network request is made regardless of how
 * many components mount simultaneously.
 *
 * placeholderData: keepPreviousData → when a forceRefresh is triggered, the old
 * data stays visible while the new fetch runs. No loading flash.
 */
export function useDashboardData() {
  return useQuery<DashboardResponse, Error>({
    queryKey: CRM_QUERY_KEYS.dashboard,
    queryFn: () => fetchDashboard(false),
    staleTime: 2 * 60 * 1000,      // 2 min: serve from cache without network
    gcTime: 10 * 60 * 1000,        // 10 min: keep in memory across navigations
    refetchInterval: 5 * 60 * 1000, // 5 min: background refresh (replaces setInterval)
    refetchIntervalInBackground: false, // Only refresh when tab is active
    refetchOnWindowFocus: true,     // Refresh when staff returns to CRM tab
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 10_000),
    placeholderData: keepPreviousData, // No flash between refreshes
  });
}

// ── Pipeline Hook ─────────────────────────────────────────────────────────────

/**
 * Pipeline is kept as a separate query because:
 * 1. It's user-editable state — must always be fresh (no staleTime)
 * 2. It reads directly from Firestore, not GAS → always fast
 * 3. It gets invalidated after every status/note change
 */
export function usePipelineData() {
  return useQuery<PipelineResponse, Error>({
    queryKey: CRM_QUERY_KEYS.pipeline,
    queryFn: fetchPipeline,
    staleTime: 0,                 // Always fresh (it's mutable user data)
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
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
    mutationFn: () => fetchDashboard(true),
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
