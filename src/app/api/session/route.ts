import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const SessionDataSchema = z.object({
  key: z.string(),
  data: z.any(),
  expiresIn: z.number().optional(), // seconds
});

// Store session data in HTTP-only cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, data, expiresIn = 3600 } = SessionDataSchema.parse(body);

    const cookieStore = await cookies();
    const sessionKey = `session_${key}`;
    
    cookieStore.set(sessionKey, JSON.stringify(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Session data saved" 
    });
  } catch (error) {
    console.error("Session save error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to save session data" },
      { status: 500 }
    );
  }
}

// Retrieve session data from cookie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    
    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionKey = `session_${key}`;
    const sessionCookie = cookieStore.get(sessionKey);
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        success: true, 
        data: null 
      });
    }

    const data = JSON.parse(sessionCookie.value);
    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Session retrieval error:", error);
    return NextResponse.json({ 
      success: true, 
      data: null 
    });
  }
}

// Delete session data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    
    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionKey = `session_${key}`;
    cookieStore.delete(sessionKey);

    return NextResponse.json({ 
      success: true, 
      message: "Session data deleted" 
    });
  } catch (error) {
    console.error("Session deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete session data" },
      { status: 500 }
    );
  }
}
