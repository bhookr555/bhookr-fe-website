import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: "Bhookr - Fresh Meal Subscriptions",
    template: "%s | Bhookr",
  },
  description:
    "Subscribe to healthy, delicious meals delivered fresh to your door. Choose from daily, weekly, or monthly plans.",
  keywords: [
    "meal subscription",
    "food delivery",
    "healthy meals",
    "meal plans",
    "fresh food",
  ],
  authors: [{ name: "Bhookr" }],
  creator: "Bhookr",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bhookr.com",
    siteName: "Bhookr",
    title: "Bhookr",
    description: "Subscribe to healthy meals delivered daily",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bhookr",
    description: "Subscribe to healthy meals delivered daily",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
