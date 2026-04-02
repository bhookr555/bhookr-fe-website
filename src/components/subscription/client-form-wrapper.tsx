"use client";

import { useState, useEffect, type ReactNode } from "react";

interface ClientFormWrapperProps {
  children: ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * ClientFormWrapper - Handles hydration issues caused by browser extensions
 * 
 * Browser extensions (password managers, form fillers) often inject attributes
 * into forms before React hydration completes, causing hydration mismatches.
 * This wrapper ensures the form only renders on the client side.
 */
export function ClientFormWrapper({ children, className, onSubmit }: ClientFormWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a placeholder during SSR with the same structure
    return (
      <form className={className} suppressHydrationWarning>
        {children}
      </form>
    );
  }

  return (
    <form 
      className={className} 
      onSubmit={onSubmit}
      suppressHydrationWarning
    >
      {children}
    </form>
  );
}

