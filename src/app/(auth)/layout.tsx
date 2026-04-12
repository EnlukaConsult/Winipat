import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: {
    default: "Winipat - Secure Account",
    template: "%s | Winipat",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-midnight relative overflow-hidden">
      {/* Background gradient layers */}
      <div className="absolute inset-0 bg-hero-gradient opacity-90" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-64 -right-64 w-[600px] h-[600px] bg-violet/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-royal/25 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-gold/8 rounded-full blur-3xl" />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Top logo bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <Link href="/" aria-label="Back to Winipat home">
          <Logo size="lg" theme="dark" />
        </Link>
        <p className="hidden sm:block text-sm text-white/50">
          Trust-First Commerce for Nigeria
        </p>
      </header>

      {/* Main content area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 text-center">
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} Winipat. All rights reserved. &middot;{" "}
          <Link href="/privacy" className="hover:text-white/60 transition-colors">
            Privacy Policy
          </Link>{" "}
          &middot;{" "}
          <Link href="/terms" className="hover:text-white/60 transition-colors">
            Terms of Service
          </Link>
        </p>
      </footer>
    </div>
  );
}
