import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, MealPlan } from "@/types";
import type { AppliedCoupon } from "@/types/coupon";
import logger from "@/lib/logger";

interface CartStore {
  items: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  addItem: (plan: MealPlan, quantity?: number) => void;
  removeItem: (planId: string) => void;
  updateQuantity: (planId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getSubtotal: () => number;
  getDiscount: () => number;
  getItemCount: () => number;
  hasItem: (planId: string) => boolean;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  syncToServer: () => Promise<void>;
}

const MAX_QUANTITY_PER_ITEM = 10;
const STORAGE_VERSION = 1;
const SYNC_DEBOUNCE_MS = 1000;
const MAX_SYNC_RETRIES = 3;

let syncTimeout: NodeJS.Timeout | null = null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const exponentialBackoff = (attempt: number) => Math.pow(2, attempt) * 1000;

const syncCartToServer = async (items: CartItem[], retries = MAX_SYNC_RETRIES): Promise<void> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        logger.debug("Cart synced successfully", { itemCount: items.length });
        return;
      }

      if (response.status >= 500 && attempt < retries - 1) {
        await delay(exponentialBackoff(attempt));
        continue;
      }

      throw new Error(`Sync failed with status ${response.status}`);
    } catch (error) {
      logger.warn(`Cart sync attempt ${attempt + 1}/${retries} failed`, { error });
      
      if (attempt === retries - 1) {
        logger.error("Cart sync failed after all retries", error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
      
      await delay(exponentialBackoff(attempt));
    }
  }
};

const debouncedSync = (items: CartItem[], set: (partial: Partial<CartStore>) => void) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  set({ syncStatus: 'syncing' });

  syncTimeout = setTimeout(async () => {
    try {
      await syncCartToServer(items);
      set({ syncStatus: 'success' });
    } catch {
      set({ syncStatus: 'error' });
    }
  }, SYNC_DEBOUNCE_MS);
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      syncStatus: 'idle',

      addItem: (plan, quantity = 1) => {
        if (!plan?.id || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
          logger.error("[Cart] Invalid plan or quantity");
          return;
        }

        set((state) => {
          const existingIndex = state.items.findIndex(item => item.planId === plan.id);
          
          const newItems = existingIndex !== -1
            ? state.items.map((item, i) => i === existingIndex
                ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY_PER_ITEM) }
                : item
              )
            : [...state.items, { planId: plan.id, plan, quantity }];

          debouncedSync(newItems, set);
          return { items: newItems };
        });
      },

      removeItem: (planId) => {
        if (!planId) {
          logger.error("[Cart] Invalid planId");
          return;
        }

        set((state) => {
          const newItems = state.items.filter(item => item.planId !== planId);
          debouncedSync(newItems, set);
          return { items: newItems };
        });
      },

      updateQuantity: (planId, quantity) => {
        if (!planId || quantity < 0) {
          logger.error("[Cart] Invalid planId or quantity");
          return;
        }

        if (quantity === 0) {
          get().removeItem(planId);
          return;
        }

        const clampedQuantity = Math.min(quantity, MAX_QUANTITY_PER_ITEM);
        if (clampedQuantity !== quantity) {
          logger.warn(`[Cart] Quantity capped at ${MAX_QUANTITY_PER_ITEM}`);
        }

        set((state) => {
          const newItems = state.items.map(item =>
            item.planId === planId ? { ...item, quantity: clampedQuantity } : item
          );
          debouncedSync(newItems, set);
          return { items: newItems };
        });
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null });
        debouncedSync([], set);
      },

      getSubtotal: () => 
        get().items.reduce((total, item) => total + (item.plan?.price || 0) * item.quantity, 0),

      getDiscount: () => 
        get().appliedCoupon?.discountAmount || 0,

      getTotalPrice: () => 
        Math.max(0, get().getSubtotal() - get().getDiscount()),

      getItemCount: () => 
        get().items.reduce((count, item) => count + item.quantity, 0),

      hasItem: (planId) => 
        get().items.some(item => item.planId === planId),

      applyCoupon: (coupon) => 
        set({ appliedCoupon: coupon }),

      removeCoupon: () => 
        set({ appliedCoupon: null }),

      syncToServer: async () => {
        const { items } = get();
        set({ syncStatus: 'syncing' });
        try {
          await syncCartToServer(items);
          set({ syncStatus: 'success' });
        } catch {
          set({ syncStatus: 'error' });
        }
      },
    }),
    {
      name: "bhookr-cart-storage",
      version: STORAGE_VERSION,
      migrate: (persistedState: any, version: number) => 
        version < STORAGE_VERSION 
          ? { items: [], appliedCoupon: null, syncStatus: 'idle' }
          : persistedState,
    }
  )
);

