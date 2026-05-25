"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Hard-fail loudly in the browser console when env vars didn't make it
  // into the production bundle. Catches both "missing" and "wrong value"
  // (anything that's not a real *.supabase.co URL) — we've now debugged
  // both flavours.
  if (!url || !anonKey) {
    const missing = [
      !url     && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean).join(", ");
    // eslint-disable-next-line no-console
    console.error(
      `[supabase/client] Missing env vars: ${missing}. ` +
      `Set in Vercel → Project Settings → Environment Variables (Production scope ticked) ` +
      `AND redeploy with build cache cleared. NEXT_PUBLIC_* inline at build time.`
    );
  } else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
    // eslint-disable-next-line no-console
    console.error(
      `[supabase/client] NEXT_PUBLIC_SUPABASE_URL doesn't look like a Supabase URL: ${url}. ` +
      `Expected something like https://<project-ref>.supabase.co. ` +
      `Common slip: pasting the Vercel deploy URL instead.`
    );
  }

  return createBrowserClient(url!, anonKey!);
}
