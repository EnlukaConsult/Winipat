"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown, Search, Package, HelpCircle, Briefcase, Mail, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

type NavItem = { label: string; href: string; icon?: React.ElementType };

const NAV: NavItem[] = [
  { label: "How It Works",   href: "/#how-it-works", icon: HelpCircle },
  { label: "For Sellers",    href: "/#sellers",      icon: Briefcase },
  { label: "Trade Accounts", href: "/trade",         icon: Briefcase },
  { label: "Track Order",    href: "/track",         icon: Package },
  { label: "Support",        href: "/contact",       icon: Mail },
];

// Marketing navbar — collapses into a hamburger drawer on mobile. Keeps the
// auth buttons (Log In / Get Started) visible at all breakpoints because
// they're the primary conversion target.
export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full bg-midnight/85 backdrop-blur-md border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" aria-label="Winipat home" className="shrink-0">
            <Logo size="md" theme="dark" />
          </Link>

          {/* Desktop links — visible from lg up; below that, hamburger */}
          <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="gold" size="sm">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger — note the bigger tap target (min-w-[44px] min-h-[44px]) */}
          <button
            type="button"
            className="lg:hidden text-white p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-white/10"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden bg-midnight border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          <ul className="px-2 py-3">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 min-h-[48px] text-sm text-white/85 hover:text-white hover:bg-white/5 rounded-md"
                >
                  {n.icon && <n.icon className="h-4 w-4 text-white/60" />}
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4 pt-2 border-t border-white/10 flex gap-2">
            <Link href="/login" onClick={() => setIsOpen(false)} className="flex-1">
              <Button variant="outline" size="md" className="w-full text-white border-white/30 hover:bg-white/10">
                Log In
              </Button>
            </Link>
            <Link href="/register" onClick={() => setIsOpen(false)} className="flex-1">
              <Button variant="gold" size="md" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
