import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BHOOKR CRM",
  // Hide all /crm/* routes from search engines.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950">{children}</div>;
}
