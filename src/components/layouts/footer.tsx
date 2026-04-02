import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Instagram } from "lucide-react";

/**
 * Responsive footer with mobile-first grid layout
 * Mobile (≤640px): Stacked 1 column
 * Tablet (641-1024px): 2 columns
 * Desktop (≥1025px): 4 columns
 * All touch targets meet WCAG 44x44px minimum
 */
export function Footer() {
  const footerLinks = {
    company: [
      { label: "Home", href: "/" },
      { label: "Menu", href: "/menu" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Refund Policy", href: "/refund" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  ];

  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      {/* Mobile-first container with fluid spacing */}
      <div className="container-responsive section-padding">
        {/* Mobile-first grid: 1 col → 2 cols → 4 cols */}
        <div className="grid gap-8 sm:gap-10 md:gap-12 lg:gap-14 xl:gap-16 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand - Full width on mobile, spans 2 cols on tablet */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4 sm:space-y-5 md:space-y-6">
            <Link href="/" className="inline-block group">
              <div className="relative h-10 w-24 sm:h-12 sm:w-32 md:h-14 md:w-40 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/finalred.png"
                  alt="BHOOKR Logo"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px"
                />
              </div>
            </Link>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm">
              Fresh, healthy meals delivered to your doorstep. Subscribe today
              and enjoy hassle-free dining.
            </p>
            {/* Social icons - Optimized touch targets (44x44px min) */}
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith('http') ? "_blank" : undefined}
                  rel={social.href.startsWith('http') ? "noopener noreferrer" : undefined}
                  className="flex h-11 w-11 sm:h-12 sm:w-12 md:h-13 md:w-13 items-center justify-center rounded-full bg-gray-200 text-gray-700 transition-all duration-300 hover:bg-[#E31E24] hover:text-white hover:scale-110 active:scale-95 dark:bg-gray-700 dark:text-gray-300 touch-manipulation shadow-sm hover:shadow-md"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h4 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              Company
            </h4>
            <ul className="space-y-2.5 sm:space-y-3 md:space-y-3.5">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block text-sm sm:text-base md:text-lg text-gray-600 hover:text-[#E31E24] dark:text-gray-400 dark:hover:text-[#E31E24] transition-colors duration-200 py-1 touch-manipulation hover:underline underline-offset-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h4 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              Legal
            </h4>
            <ul className="space-y-2.5 sm:space-y-3 md:space-y-3.5">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block text-sm sm:text-base md:text-lg text-gray-600 hover:text-[#E31E24] dark:text-gray-400 dark:hover:text-[#E31E24] transition-colors duration-200 py-1 touch-manipulation hover:underline underline-offset-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h4 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              Contact
            </h4>
            <ul className="space-y-2.5 sm:space-y-3 md:space-y-3.5 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
              <li>
                <a 
                  href="mailto:Bhookr555@gmail.com" 
                  className="inline-block hover:text-[#E31E24] transition-colors duration-200 break-all py-1 touch-manipulation hover:underline underline-offset-2"
                >
                  bhookr555@gmail.com
                </a>
              </li>
              <li>
                <a 
                  href="tel:+919542762906" 
                  className="inline-block hover:text-[#E31E24] transition-colors duration-200 py-1 touch-manipulation hover:underline underline-offset-2"
                >
                  +91 95427 62906
                </a>
              </li>
              <li className="flex items-start gap-2 py-1">
                <span>Hyderabad, Telangana</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright - Fluid spacing and better text wrapping */}
        <div className="mt-8 sm:mt-10 md:mt-12 lg:mt-14 xl:mt-16 border-t border-gray-200 dark:border-gray-700 pt-6 sm:pt-8 md:pt-10">
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 text-center leading-relaxed px-2">
            &copy; {new Date().getFullYear()}{" "}
            <span className="font-semibold text-[#E31E24]">
              BHOOKR CLOUD KITCHEN PRIVATE LIMITED
            </span>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
