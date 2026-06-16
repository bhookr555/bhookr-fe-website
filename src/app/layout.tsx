import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Script from "next/script";

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
      <head>
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;
            n.push=n;
            n.loaded=!0;
            n.version='2.0';
            n.queue=[];
            t=b.createElement(e);
            t.async=!0;
            t.src=v;
            s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}
            (window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', '974879258804583');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>

      <body className={`${inter.variable} font-sans antialiased`}>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=974879258804583&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
