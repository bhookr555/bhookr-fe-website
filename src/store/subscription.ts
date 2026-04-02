import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubscriptionFormData } from "@/types/subscription";
import type { AppliedCoupon } from "@/types/coupon";

interface SubscriptionStore {
  currentStep: number;
  formData: Partial<SubscriptionFormData>;
  isAuthenticated: boolean;
  appliedCoupon: AppliedCoupon | null;
  
  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (data: Partial<SubscriptionFormData>) => void;
  setAuthenticated: (isAuth: boolean) => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  resetForm: () => void;
  getTotalSteps: () => number;
}

const TOTAL_STEPS = 9;

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      formData: {},
      isAuthenticated: false,
      appliedCoupon: null,

      setCurrentStep: (step) => {
        if (step >= 0 && step <= TOTAL_STEPS) {
          set({ currentStep: step });
        }
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < TOTAL_STEPS) {
          set({ currentStep: currentStep + 1 });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      updateFormData: (data) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }));
      },

      setAuthenticated: (isAuth) => {
        set({ isAuthenticated: isAuth });
      },

      applyCoupon: (coupon) => {
        set({ appliedCoupon: coupon });
      },

      removeCoupon: () => {
        set({ appliedCoupon: null });
      },

      resetForm: () => {
        set({
          currentStep: 0,
          formData: {},
          appliedCoupon: null,
        });
      },

      getTotalSteps: () => TOTAL_STEPS,
    }),
    {
      name: "subscription-storage",
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
        appliedCoupon: state.appliedCoupon,
      }),
    }
  )
);
