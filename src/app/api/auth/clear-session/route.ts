import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear all auth-related cookies
    cookieStore.delete('firebase-id-token');
    cookieStore.delete('__session');
    cookieStore.delete('bhookr_session');

    logger.debug('Auth session cookies cleared');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to clear session cookies', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}

