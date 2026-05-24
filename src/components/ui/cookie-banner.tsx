"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Cookie } from "lucide-react";

const STORAGE_KEY = "winipat-cookie-consent";

type Choice = "accepted" | "essential-only";

/**
 * Cookie consent banner. Renders the first time a visitor lands on the site
 * and stores their choice in localStorage so it doesn't re-show.
 *
 * For now Winipat only uses essential cookies (auth session via Supabase),
 * which are exempt from consent in most jurisdictions. The banner is a
 * best-practice notice + future-proofing for when analytics gets added.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no prior choice. localStorage is only available client-side.
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage blocked (private mode / SSR) — silently skip the banner
    }
  }, []);

  function record(choice: Choice) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() }),
      );
    } catch {
      // Ignore storage failures — UX is the same either way
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 rounded-[--radius-lg] bg-midnight text-white shadow-2xl border border-white/10 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-[--radius-md] bg-royal/20 flex items-center justify-center shrink-0">
          <Cookie className="h-5 w-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">We use cookies</p>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            Winipat uses essential cookies to keep you signed in and your cart working.
            See our{" "}
            <Link href="/legal/privacy" className="text-gold underline hover:text-white">
              Privacy Policy
            </Link>
            {" "}for details.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => record("accepted")}
              className="rounded-[--radius-md] bg-gold text-midnight text-xs font-semibold px-3 py-1.5 hover:bg-gold/90 transition-colors"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => record("essential-only")}
              className="rounded-[--radius-md] bg-white/10 text-white text-xs font-medium px-3 py-1.5 hover:bg-white/15 transition-colors"
            >
              Essential only
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss cookie banner"
          onClick={() => record("essential-only")}
          className="text-white/50 hover:text-white shrink-0 -mt-1 -mr-1 p-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
