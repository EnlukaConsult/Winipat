"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Hard-fail loudly in the browser console when env vars didn't make it
  // into the production bundle. We've debugged "Failed to fetch" caused
  // by these being undefined; a clear console error is much faster than
  // scanning the JS chunks.
  if (!url || !anonKey) {
    const missing = [
      !url     && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean).join(", ");
    // eslint-disable-next-line no-console
    console.error(
      `[supabase/client] Missing env vars: ${missing}. ` +
      `These must be set in Vercel (Project Settings > Environment Variables) ` +
      `with Production scope ticked, AND a fresh build must run with cache cleared. ` +
      `NEXT_PUBLIC_* are inlined at build time, not runtime.`
    );
  }

  return createBrowserClient(url!, anonKey!);
}
