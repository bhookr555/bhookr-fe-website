"use client";

import { PaymentLoader } from "./payment-loader";

interface LoadingOverlayProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

/**
 * LoadingOverlay - Full-screen or inline loading component with payment loader
 * 
 * @param message - Optional loading message to display
 * @param size - Size of the loader (sm, md, lg)
 * @param fullScreen - If true, displays as full-screen overlay
 * 
 * @example
 * ```tsx
 * <LoadingOverlay message="Processing payment..." size="lg" fullScreen />
 * ```
 */
export function LoadingOverlay({ 
  message = "Loading...", 
  size = "md",
  fullScreen = true 
}: LoadingOverlayProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        <PaymentLoader size={size} />
        {message && (
          <p className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
