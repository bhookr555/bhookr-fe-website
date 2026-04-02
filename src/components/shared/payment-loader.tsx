"use client";

import React from "react";

interface PaymentLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * PaymentLoader - Animated spinner component for payment processing states
 * 
 * @param size - Size variant: 'sm' (30px), 'md' (50px), 'lg' (70px)
 * @param className - Additional CSS classes
 * 
 * @example
 * ```tsx
 * <PaymentLoader size="md" />
 * ```
 */
export function PaymentLoader({ size = "md", className = "" }: PaymentLoaderProps) {
  const sizeClasses = {
    sm: "w-[30px]",
    md: "w-[50px]",
    lg: "w-[70px]",
  };

  return (
    <div 
      className={`payment-loader ${sizeClasses[size]} ${className}`.trim()}
      role="status"
      aria-label="Loading"
    />
  );
}

export default PaymentLoader;
