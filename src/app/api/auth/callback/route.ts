import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Auth callback for email confirmation, magic link, password reset, etc.
//
// Supports two flows:
//   1. token_hash (preferred for email) — works cross-device because it
//      doesn't depend on a PKCE verifier stored in the originating browser.
//      Used when the email template links via `{{ .ConfirmationURL }}` with
//      the SiteURL pointing at this route (token_hash + type in querystring).
//   2. code (PKCE) — Supabase's default for OAuth and same-device email
//      flows. Kept for backward compatibility with any verification emails
//      already in flight when this route was deployed.
//
// On success: sets the session cookie, then redirects role-aware so the
// user lands on their portal home (no extra sign-in step).
//
// On failure: redirects to /login with the email pre-filled and a friendly
// error code the login page can decode into a banner.

const ROLE_LANDING: Record<string, string> = {
  admin:     "/admin",
  seller:    "/seller",
  buyer:     "/dashboard/browse",
  logistics: "/logistics/pickups",
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type      = searchParams.get("type") as EmailOtpType | null;
  const code      = searchParams.get("code");

  // Honor ?next= if present and relative (open-redirect guard), otherwise
  // pick the landing by role after we know who the user is.
  const nextParam = searchParams.get("next");
  const explicitNext =
    nextParam && nextParam.startsWith("/") ? nextParam : null;

  const supabase = await createClient();

  let verifyError: string | null = null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) verifyError = error.message;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) verifyError = error.message;
  } else {
    verifyError = "missing_token";
  }

  if (verifyError) {
    const url = new URL(`${origin}/login`);
    url.searchParams.set("error", "confirmation_failed");
    return NextResponse.redirect(url);
  }

  // Recovery (password reset) — send to the set-new-password page even
  // though a session is now set. We don't want to drop them on a dashboard
  // because the whole point of clicking the email is to change the password.
  // Honor explicit ?next= if the caller (e.g. forgot-password page) set one.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}${explicitNext ?? "/update-password"}`);
  }

  // Email change — confirm the new address, land on the profile page.
  if (type === "email_change") {
    return NextResponse.redirect(`${origin}/dashboard/profile`);
  }

  // Verified + session set. Find the role to land them on the right page.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let landing = explicitNext ?? "/dashboard/browse";

  if (!explicitNext && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role ?? "buyer";
    landing = ROLE_LANDING[role] ?? "/dashboard/browse";
  }

  return NextResponse.redirect(`${origin}${landing}`);
}
