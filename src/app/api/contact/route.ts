import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validators";
import { rateLimit, getIdentifier, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = getIdentifier(request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.CONTACT);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          message: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    // Store contact inquiries directly in Supabase leads table so they appear in CRM
    try {
      const { supabaseAdmin } = await import('@/lib/supabase/server');
      const cleanEmail = validatedData.email.trim().toLowerCase();
      const rawPhone = (body as any)?.phone || (body as any)?.phoneNumber;
      const phoneDigits = rawPhone ? String(rawPhone).replace(/\D/g, "") : null;

      await supabaseAdmin.from('leads').upsert(
        {
          name: validatedData.name.trim(),
          email: cleanEmail,
          phone_number: phoneDigits || null,
          goal: validatedData.subject || "Contact Form Inquiry",
          food_love: validatedData.message || null,
          status: "new",
          lead_source: "website",
          last_step_completed: 1,
          created_at: new Date().toISOString(),
        },
        { onConflict: "email,lead_source" }
      );
    } catch (dbErr) {
      console.warn('[Contact API] Failed to save inquiry to Supabase leads:', dbErr);
    }

    return NextResponse.json(
      { message: "Message sent successfully" },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
