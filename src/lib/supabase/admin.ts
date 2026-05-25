import { createClient } from "@supabase/supabase-js";

// Service-role client for trusted server-side jobs (cron, webhooks,
// public form submissions where the API does its own validation).
// Bypasses RLS — must NEVER be imported into a client component or a
// route that returns user-controlled data without explicit checks.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  // Sanity-check the JWT's `role` claim. If admins paste the anon key
  // here by mistake, RLS still applies and you get cryptic "new row
  // violates row-level security policy" errors. Catch that early.
  try {
    const payload = serviceKey.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(
        Buffer.from(payload, "base64").toString("utf-8")
      ) as { role?: string };
      if (decoded.role && decoded.role !== "service_role") {
        throw new Error(
          `SUPABASE_SERVICE_ROLE_KEY has role="${decoded.role}", expected "service_role". ` +
          `You probably pasted the anon key by mistake. Get the service_role key from ` +
          `Supabase → Settings → API → Legacy keys → service_role (red "secret" badge).`
        );
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      throw e;
    }
    // Couldn't decode — let the actual API call fail with its own error.
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
