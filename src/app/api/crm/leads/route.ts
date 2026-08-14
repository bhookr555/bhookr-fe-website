import { NextRequest, NextResponse } from "next/server";
import { authorizeCrmStaff } from "@/lib/api-auth";
import {
  getCachedData,
  setCachedData,
  isCacheFresh,
  GAS_CACHE_TTL_MS,
} from "@/lib/crm/cache";
import { deduplicateAndMergeLeads } from "@/lib/crm/leads-aggregator";
import type { LeadRow } from "@/lib/crm/leads";

export const dynamic = "force-dynamic";

async function fetchGasData(url: string): Promise<{ success: boolean; rows: LeadRow[]; total: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`${url}?action=list`, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      success: true,
      rows: Array.isArray(data.rows) ? data.rows : [],
      total: typeof data.total === "number" ? data.total : (data.rows?.length || 0),
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function GET(req: NextRequest) {
  const authStatus = await authorizeCrmStaff(req);
  if (!authStatus.authorized) {
    return NextResponse.json(
      { success: false, error: authStatus.error || "Forbidden", rows: [], total: 0 },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  // Read both slices from Firestore cache in parallel
  const [cachedLeads, cachedClientForm] = await Promise.all([
    getCachedData<any>("leads"),
    getCachedData<any>("client_form"),
  ]);

  const websiteFresh = !forceRefresh && isCacheFresh(cachedLeads?.cachedAt, GAS_CACHE_TTL_MS);
  const clientFormFresh = !forceRefresh && isCacheFresh(cachedClientForm?.cachedAt, GAS_CACHE_TTL_MS);

  let websiteData = cachedLeads?.data;
  let clientFormData = cachedClientForm?.data;

  const websiteUrl = process.env.NEXT_PUBLIC_LEADS_SHEET_URL;
  const clientFormUrl = process.env.NEXT_PUBLIC_CLIENT_FORM_SHEET_URL;

  // 1. Refresh website leads upstream if stale or missing
  if ((!websiteFresh || !websiteData) && websiteUrl) {
    try {
      websiteData = await fetchGasData(websiteUrl);
      setCachedData("leads", websiteData).catch((e) =>
        console.warn("[leads API] Website leads cache write error:", e)
      );
    } catch (err) {
      console.warn("[leads API] Website leads upstream fetch failed, using cached fallback:", err);
    }
  }

  // 2. Refresh client sheet leads upstream if stale or missing
  if ((!clientFormFresh || !clientFormData) && clientFormUrl) {
    try {
      clientFormData = await fetchGasData(clientFormUrl);
      setCachedData("client_form", clientFormData).catch((e) =>
        console.warn("[leads API] Client form cache write error:", e)
      );
    } catch (err) {
      console.warn("[leads API] Client form sheet upstream fetch failed, using cached fallback:", err);
    }
  } else if (!clientFormUrl) {
    console.warn("[leads API] NEXT_PUBLIC_CLIENT_FORM_SHEET_URL is not configured in environment.");
  }

  const webRows: LeadRow[] = Array.isArray(websiteData?.rows)
    ? websiteData.rows.map((r: LeadRow) => ({ ...r, leadSource: "website" }))
    : [];

  const clientRows: LeadRow[] = Array.isArray(clientFormData?.rows)
    ? clientFormData.rows.map((r: LeadRow) => ({ ...r, leadSource: "client_form" }))
    : [];

  // Deduplicate and merge both sources
  const deduplicatedRows = deduplicateAndMergeLeads(webRows, clientRows);

  return NextResponse.json(
    {
      success: true,
      rows: deduplicatedRows,
      total: deduplicatedRows.length,
      meta: {
        websiteLeadsCount: webRows.length,
        clientFormLeadsCount: clientRows.length,
        deduplicatedTotal: deduplicatedRows.length,
      },
    },
    {
      headers: {
        "X-Cache": websiteFresh && clientFormFresh ? "HIT" : "MISS",
        "Cache-Control": "private, max-age=0",
      },
    }
  );
}
