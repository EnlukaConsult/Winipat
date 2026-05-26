"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OAuthButtonsProps = {
  // Where the user should land after the OAuth round-trip finishes. The
  // callback honors this via the `next` querystring; omit to use the role-
  // aware default.
  next?: string;
};

// Google + Facebook continue-with buttons. Google is live (requires the
// provider to be enabled in the Supabase dashboard with a Client ID + Secret
// from Google Cloud Console). Facebook is rendered disabled until the
// Meta Developer app is created.
export function OAuthButtons({ next }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "facebook" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Shared launcher — Supabase signInWithOAuth redirects the browser if the
  // provider call succeeds, so the only state we need to handle locally is
  // the error path.
  async function signInWith(provider: "google" | "facebook") {
    setLoadingProvider(provider);
    setError(null);
    try {
      const supabase = createClient();
      const origin =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const callbackBase = `${origin}/api/auth/callback`;
      const redirectTo = next
        ? `${callbackBase}?next=${encodeURIComponent(next)}`
        : callbackBase;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoadingProvider(null);
      }
    } catch {
      setError(`Couldn't start ${provider} sign-in. Please try again.`);
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-mist" />
        </div>
        <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wider">
          <span className="bg-white px-3 text-slate-light">
            or continue with
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-error/8 border border-error/20 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => signInWith("google")}
          disabled={loadingProvider !== null}
          className="h-12 flex items-center justify-center gap-2 rounded-xl border border-mist-dark bg-white text-slate font-semibold hover:bg-cloud transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {loadingProvider === "google" ? (
            <span className="h-4 w-4 border-2 border-slate-light border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span className="text-sm">
            {loadingProvider === "google" ? "Connecting…" : "Google"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => signInWith("facebook")}
          disabled={loadingProvider !== null}
          className="h-12 flex items-center justify-center gap-2 rounded-xl border border-mist-dark bg-white text-slate font-semibold hover:bg-cloud transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {loadingProvider === "facebook" ? (
            <span className="h-4 w-4 border-2 border-slate-light border-t-transparent rounded-full animate-spin" />
          ) : (
            <FacebookIcon />
          )}
          <span className="text-sm">
            {loadingProvider === "facebook" ? "Connecting…" : "Facebook"}
          </span>
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}
