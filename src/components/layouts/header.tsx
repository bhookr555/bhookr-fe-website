"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { ShoppingCart, Menu, X, LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/layouts/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function Header() {
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();
  const { user, loading, signOut: handleSignOut } = useAuth();

  // Prevent hydration mismatch by only showing cart count after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle cart click - cart is now public
  const handleCartClick = () => {
    closeMobileMenu();
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/subscribe", label: "Subscribe" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm dark:border-gray-700 dark:bg-gray-900/95">
      {/* Mobile-optimized layout */}
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-16 md:h-18 lg:h-20 gap-2">
          
          {/* Left - Logo */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <Link href="/" className="flex items-center group" onClick={closeMobileMenu}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative w-20 h-8 sm:w-28 sm:h-10 md:w-36 md:h-12 lg:w-40 lg:h-13 xl:w-44 xl:h-14"
              >
                <Image
                  src="/finalred.png"
                  alt="BHOOKR Logo"
                  fill
                  className="object-contain object-left"
                  priority
                  sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, (max-width: 1024px) 144px, 176px"
                />
              </motion.div>
            </Link>
          </div>

          {/* Center - Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center space-x-3 lg:space-x-5 xl:space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative text-sm lg:text-base xl:text-lg font-medium text-gray-700 transition-colors hover:text-[#E31E24] dark:text-gray-300 dark:hover:text-[#E31E24] group whitespace-nowrap px-1"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-[#E31E24] transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>
          </nav>

          {/* Right - Actions */}
          <div className="flex items-center gap-2 sm:gap-2 md:gap-2.5 lg:gap-3 flex-shrink-0">
            <ThemeToggle />

            {/* Cart - Responsive sizing with better touch targets */}
            <Link href="/cart" onClick={handleCartClick}>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 hover:bg-red-50 hover:text-[#E31E24] dark:hover:bg-red-900/20 rounded-full transition-all"
                aria-label={`Shopping cart with ${mounted ? itemCount : 0} items`}
              >
                <ShoppingCart className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                {mounted && itemCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#E31E24] text-[10px] sm:text-xs font-bold text-white shadow-lg ring-2 ring-white dark:ring-gray-900"
                    aria-label={`${itemCount} items in cart`}
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </motion.span>
                )}
              </Button>
            </Link>

            {/* Sign In Button - Desktop (hidden on tablet and below) */}
            {loading ? (
              <div className="hidden lg:block w-24 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    className="hidden lg:inline-flex items-center gap-2 font-semibold px-4 lg:px-5 xl:px-6 py-2 lg:py-2.5 text-sm lg:text-base border-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <User className="w-4 h-4" />
                    {user.displayName?.split(" ")[0] || "Account"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-subscription">My Subscription</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                asChild 
                className="hidden lg:inline-flex bg-[#E31E24] hover:bg-[#C41E3A] active:bg-[#A01828] text-white font-semibold px-4 lg:px-5 xl:px-6 py-2 lg:py-2.5 text-sm lg:text-base transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                <Link href="/signin">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu Button - Touch optimized */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 sm:h-11 sm:w-11 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 sm:h-6 sm:w-6" />
              ) : (
                <Menu className="h-6 w-6 sm:h-6 sm:w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Full-width sliding menu with improved touch targets */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-gray-200 dark:border-gray-700 md:hidden bg-white dark:bg-gray-900 overflow-hidden"
          >
            <nav className="container-responsive flex flex-col py-3 sm:py-4 space-y-0.5">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <Link
                    href={link.href}
                    className="block py-3.5 sm:py-4 px-4 text-base sm:text-lg font-medium text-gray-700 transition-colors hover:text-[#E31E24] hover:bg-red-50 dark:text-gray-300 dark:hover:text-[#E31E24] dark:hover:bg-red-900/20 rounded-lg active:scale-98 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              
              {/* Mobile Sign In Button - Larger touch target */}
              <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 mt-2">
                {user ? (
                  <div className="space-y-2">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button 
                      onClick={handleSignOut}
                      variant="destructive"
                      className="w-full py-4 sm:py-5 text-base sm:text-lg touch-manipulation min-h-[52px] rounded-lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button 
                    asChild 
                    className="w-full bg-[#E31E24] hover:bg-[#C41E3A] active:bg-[#A01828] text-white font-bold py-4 sm:py-5 text-base sm:text-lg touch-manipulation min-h-[52px] rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    <Link href="/signin" onClick={closeMobileMenu}>
                      Sign In
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
