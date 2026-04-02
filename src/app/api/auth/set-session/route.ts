import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import logger from '@/lib/logger';

const sessionSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = sessionSchema.parse(body);

    const cookieStore = await cookies();
    
    // Set httpOnly cookie with strict security settings
    cookieStore.set('firebase-id-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
      path: '/',
    });

    logger.debug('Auth session cookie set');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to set session cookie', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to set session' },
      { status: 500 }
    );
  }
}

