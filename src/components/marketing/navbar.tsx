"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full glass-dark">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <Logo size="md" theme="dark" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm text-white/80 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#features" className="text-sm text-white/80 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#sellers" className="text-sm text-white/80 hover:text-white transition-colors">
              For Sellers
            </Link>
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

          <button
            className="md:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden glass-dark border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="#how-it-works"
              className="block text-white/80 hover:text-white py-2"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#features"
              className="block text-white/80 hover:text-white py-2"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#sellers"
              className="block text-white/80 hover:text-white py-2"
              onClick={() => setIsOpen(false)}
            >
              For Sellers
            </Link>
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-white border-white/30">
                  Log In
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button variant="gold" size="sm" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
