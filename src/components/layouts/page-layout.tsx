import { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageLayout - A reusable layout component that ensures all pages have consistent Header and Footer
 * 
 * Usage:
 * ```tsx
 * import { PageLayout } from "@/components/layouts/page-layout";
 * 
 * export default function YourPage() {
 *   return (
 *     <PageLayout>
 *       <div className="container mx-auto py-8">
 *         Your page content here
 *       </div>
 *     </PageLayout>
 *   );
 * }
 * ```
 * 
 * Or with custom main className:
 * ```tsx
 * <PageLayout className="bg-gray-50">
 *   Your content
 * </PageLayout>
 * ```
 */
export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={`flex-1 ${className}`.trim()}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
