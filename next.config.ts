import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly forward NEXT_PUBLIC_* env vars to the client bundle.
  // Vercel was failing to inline these for some browser chunks, causing
  // /register and /login to fail with "Failed to fetch" (the Supabase
  // client was constructed with `undefined` for the URL). Listing them
  // here in next.config.env forces Next.js to bake them as build-time
  // constants. Values come from Vercel's Project Environment Variables.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:           process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    NEXT_PUBLIC_APP_URL:                process.env.NEXT_PUBLIC_APP_URL,
  },
};

export default nextConfig;
