import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_ORDERS_SHEET_URL;

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: "NEXT_PUBLIC_ORDERS_SHEET_URL is not configured.",
        rows: [],
        total: 0,
      },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${url}?action=list`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Sheet endpoint returned ${upstream.status}`,
          rows: [],
          total: 0,
        },
        { status: 502 }
      );
    }

    const raw = await upstream.json();

    // The Orders sheet has a typo in cell A1 ("KI " instead of "timestamp").
    // Normalize it here so the UI can treat it as a normal timestamp field.
    if (raw && Array.isArray(raw.rows)) {
      raw.rows = raw.rows.map((row: Record<string, unknown>) => {
        if (row && "KI " in row && !("timestamp" in row)) {
          const { ["KI "]: ts, ...rest } = row;
          return { timestamp: ts, ...rest };
        }
        return row;
      });
    }

    return NextResponse.json(raw, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json(
      { success: false, error: message, rows: [], total: 0 },
      { status: 502 }
    );
  }
}
