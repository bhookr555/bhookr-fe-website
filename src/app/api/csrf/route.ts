import { NextRequest, NextResponse } from 'next/server';
import { createCsrfToken } from '@/lib/csrf';

/**
 * GET endpoint to generate CSRF token
 * Frontend should call this before making state-changing requests
 */
export async function GET(request: NextRequest) {
  const token = createCsrfToken(request);

  return NextResponse.json({ 
    token,
    expiresIn: 3600, // 1 hour
  });
}

