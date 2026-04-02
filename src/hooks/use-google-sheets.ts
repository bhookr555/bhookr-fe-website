/**
 * Hook for handling Google Sheets submissions
 * Provides functions to submit leads and subscriptions
 */

import { useState, useCallback } from 'react';
import { submitLeadToSheet, submitSubscriptionToSheet, submitWithRetry } from '@/lib/google-sheets';
import type { LeadData, SubscriptionData } from '@/lib/google-sheets';
import { toast } from 'sonner';

interface UseGoogleSheetsReturn {
  isSubmitting: boolean;
  error: string | null;
  submitLead: (data: LeadData) => Promise<boolean>;
  submitSubscription: (data: SubscriptionData) => Promise<boolean>;
}

export function useGoogleSheets(): UseGoogleSheetsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit lead to Google Sheets
   * Called when user completes Step 7
   */
  const submitLead = useCallback(async (data: LeadData): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitWithRetry(
        () => submitLeadToSheet(data),
        3, // Max retries
        1000 // Initial delay (ms)
      );

      if (response.success) {
        console.log('✅ Lead submitted successfully:', response.email);
        return true;
      } else {
        const errorMessage = response.error || 'Failed to submit lead';
        console.error('❌ Lead submission failed:', errorMessage);
        setError(errorMessage);
        
        // Show toast notification
        toast.error('Failed to save your information', {
          description: 'Your data may not have been saved. Please try again.',
        });
        
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Lead submission error:', errorMessage);
      setError(errorMessage);
      
      // Don't show error toast - allow form to proceed even if tracking fails
      console.warn('Lead tracking failed but allowing user to continue');
      return true; // Return true to allow user to continue despite tracking failure
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /**
   * Submit subscription to Google Sheets
   * Called after payment is successfully completed
   */
  const submitSubscription = useCallback(async (data: SubscriptionData): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitWithRetry(
        () => submitSubscriptionToSheet(data),
        3, // Max retries
        1000 // Initial delay (ms)
      );

      if (response.success) {
        console.log('✅ Subscription submitted successfully:', {
          email: response.email,
          orderId: response.orderId,
        });
        return true;
      } else {
        const errorMessage = response.error || 'Failed to submit subscription';
        console.error('❌ Subscription submission failed:', errorMessage);
        setError(errorMessage);
        
        // Show warning toast but don't block user
        toast.warning('Subscription recorded with issues', {
          description: 'Your payment was successful, but there was an issue recording details.',
        });
        
        return true; // Return true to allow user to see success page
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Subscription submission error:', errorMessage);
      setError(errorMessage);
      
      // Show warning but don't block user since payment succeeded
      toast.warning('Subscription tracking failed', {
        description: 'Your payment was successful. Our team will contact you shortly.',
      });
      
      return true; // Return true since payment succeeded
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    error,
    submitLead,
    submitSubscription,
  };
}
