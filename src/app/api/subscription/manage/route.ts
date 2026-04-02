/**
 * Subscription Management API
 * POST /api/subscription/manage
 * 
 * Handles pause, resume, upgrade, downgrade operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { rateLimit, getIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import {
  pauseSubscription,
  resumeSubscription,
  upgradeSubscription,
  downgradeSubscription,
} from '@/lib/subscription-management';

/**
 * Validation schemas
 */
const pauseSchema = z.object({
  action: z.literal('pause'),
  subscriptionId: z.string().min(1),
  reason: z.string().optional(),
});

const resumeSchema = z.object({
  action: z.literal('resume'),
  subscriptionId: z.string().min(1),
});

const upgradeSchema = z.object({
  action: z.literal('upgrade'),
  subscriptionId: z.string().min(1),
  newPlan: z.object({
    planType: z.enum(['lite', 'standard', 'elite']),
    duration: z.enum(['7_days', 'monthly']),
    dietType: z.enum(['low_carb_high_protein', 'balanced_meal', 'ketogenic', 'salads', 'muscle_gain', 'mass_bowls']),
    foodPreference: z.enum(['non_veg', 'veg', 'eggtarian', 'vegan']),
  }),
});

const downgradeSchema = z.object({
  action: z.literal('downgrade'),
  subscriptionId: z.string().min(1),
  newPlan: z.object({
    planType: z.enum(['lite', 'standard', 'elite']),
    duration: z.enum(['7_days', 'monthly']),
    dietType: z.enum(['low_carb_high_protein', 'balanced_meal', 'ketogenic', 'salads', 'muscle_gain', 'mass_bowls']),
    foodPreference: z.enum(['non_veg', 'veg', 'eggtarian', 'vegan']),
  }),
});

const requestSchema = z.discriminatedUnion('action', [
  pauseSchema,
  resumeSchema,
  upgradeSchema,
  downgradeSchema,
]);

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getIdentifier(request);
  
  try {
    // Authentication
    const user = await requireAuth(request);
    logger.info('[API] Subscription management request', {
      userId: user.uid,
      identifier,
    });
    
    // Rate limiting
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.SUBSCRIPTION);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    // Parse and validate request
    const body = await request.json();
    const validatedData = requestSchema.parse(body);
    
    // Handle different actions
    let result: any;
    
    switch (validatedData.action) {
      case 'pause':
        result = await pauseSubscription(
          validatedData.subscriptionId,
          validatedData.reason
        );
        break;
      
      case 'resume':
        result = await resumeSubscription(validatedData.subscriptionId);
        break;
      
      case 'upgrade':
        result = await upgradeSubscription(
          validatedData.subscriptionId,
          validatedData.newPlan
        );
        break;
      
      case 'downgrade':
        result = await downgradeSubscription(
          validatedData.subscriptionId,
          validatedData.newPlan
        );
        break;
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    logger.info('[API] Subscription management completed', {
      action: validatedData.action,
      subscriptionId: validatedData.subscriptionId,
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('[API] Subscription management failed', error as Error, {
      identifier,
      duration: Date.now() - startTime,
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}
