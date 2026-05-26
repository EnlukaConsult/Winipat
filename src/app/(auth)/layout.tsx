import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";

export const metadata: Metadata = {
  title: {
    default: "Winipat - Secure Account",
    template: "%s | Winipat",
  },
};

// Auth shell — provides the radial brand gradient + shared marketing nav.
// Pages control their own internal layout: /login and /register use a wide
// two-column (marketing + form card); /verify, /forgot-password, and
// /update-password render a single centered card.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-dvh flex flex-col text-white relative overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 78% 14%, rgba(109,61,242,0.96), transparent 36%),
          radial-gradient(circle at 20% 78%, rgba(19,197,168,0.16), transparent 34%),
          linear-gradient(120deg,#050a22 0%,#14236f 52%,#7138ef 100%)
        `,
      }}
    >
      {/* Subtle grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <Navbar />

      {/* Spacer for the fixed navbar (h-16) so content doesn't slide under it */}
      <main className="relative z-[1] flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          {children}
        </div>
      </main>

      <footer className="relative z-[1] py-6 px-6 text-center">
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} Winipat. All rights reserved. &middot;{" "}
          <Link
            href="/legal/privacy"
            className="hover:text-white/70 transition-colors"
          >
            Privacy Policy
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/legal/terms"
            className="hover:text-white/70 transition-colors"
          >
            Terms of Service
          </Link>
        </p>
      </footer>
    </div>
  );
}
