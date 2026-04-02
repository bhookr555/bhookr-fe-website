import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "article";
}

/**
 * Container component for consistent max-width and padding
 * Follows industry-standard layout patterns (Stripe, Vercel, Airbnb)
 */
export function Container({ 
  children, 
  className, 
  as: Component = "div" 
}: ContainerProps) {
  return (
    <Component className={cn(
      "mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8",
      className
    )}>
      {children}
    </Component>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  fullWidth?: boolean;
}

/**
 * Section component with consistent padding and optional background
 */
export function Section({ 
  children, 
  className,
  containerClassName,
  fullWidth = false
}: SectionProps) {
  return (
    <section className={cn("w-full", className)}>
      {fullWidth ? (
        children
      ) : (
        <Container className={cn("py-16 md:py-24", containerClassName)}>
          {children}
        </Container>
      )}
    </section>
  );
}

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page wrapper for consistent layout structure
 */
export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      {children}
    </div>
  );
}

interface GridProps {
  children: ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

/**
 * Responsive grid component with industry-standard breakpoints
 */
export function Grid({ 
  children, 
  cols = { default: 1, md: 2, lg: 3 },
  gap = 8,
  className 
}: GridProps) {
  const gridClasses = cn(
    "grid",
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    `gap-${gap}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

interface FlexProps {
  children: ReactNode;
  direction?: "row" | "col";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  gap?: number;
  className?: string;
}

/**
 * Flexible flexbox component
 */
export function Flex({ 
  children, 
  direction = "row",
  align = "start",
  justify = "start",
  gap = 4,
  className 
}: FlexProps) {
  return (
    <div className={cn(
      "flex",
      direction === "col" && "flex-col",
      `items-${align}`,
      `justify-${justify}`,
      `gap-${gap}`,
      className
    )}>
      {children}
    </div>
  );
}
