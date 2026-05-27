"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Landing for the phone-OTP signup path. Receives ?phone=<E.164>,
// shows a 6-digit code input, calls supabase.auth.verifyOtp on submit,
// and routes to /welcome (post-OAuth onboarding) on success — same
// destination as the Google/Facebook OAuth signups, since phone signups
// share the same "I'm a new user, fill in role + finalise" state.
export default function VerifyPhonePage() {
  return (
    <div className="max-w-md mx-auto">
      <Suspense
        fallback={
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-violet border-t-transparent rounded-full mx-auto" />
          </div>
        }
      >
        <VerifyPhoneContent />
      </Suspense>
    </div>
  );
}

function VerifyPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Cooldown timer between resend attempts
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Auto-submit when the user types all 6 digits — saves a tap. Common
  // SMS auto-fill on iOS / Android paste-the-code-from-notification
  // pattern.
  useEffect(() => {
    if (code.length === 6 && !verifying) {
      void verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function verify() {
    if (code.length !== 6 || !phone) return;
    setVerifying(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (verifyError) {
        const msg = verifyError.message.toLowerCase();
        if (msg.includes("expired") || msg.includes("invalid")) {
          setError("That code is invalid or expired. Request a new one.");
        } else {
          setError(verifyError.message);
        }
        setCode("");
        return;
      }
      setSuccess(true);
      // After OTP succeeds, the user has a session. /welcome handles the
      // role+phone+terms onboarding (it bounces back to /login if no
      // session, but we just created one). Same destination as Google/
      // Facebook OAuth signups to keep one onboarding path.
      setTimeout(() => router.push("/welcome"), 800);
    } catch {
      setError("Couldn't verify the code. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (countdown > 0 || !phone || resending) return;
    setResending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) {
        setError(otpError.message);
      } else {
        setResentAt(Date.now());
        setCountdown(60);
      }
    } finally {
      setResending(false);
    }
  }

  if (!phone) {
    return (
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-8 text-center">
        <p className="text-sm font-bold text-midnight">No phone number on file</p>
        <p className="mt-1 text-sm text-slate-light">
          Start signup from{" "}
          <Link href="/register" className="text-violet font-semibold hover:underline">
            the register page
          </Link>
          .
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald/20 border border-emerald/30 mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
            Phone verified
          </h1>
          <p className="mt-1.5 text-sm text-white/60">
            Setting up your account&hellip;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
        <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet/20 border border-violet/30 mb-4">
          <MessageSquare className="h-7 w-7 text-violet-light" aria-hidden="true" />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gold" />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
          Verify your phone
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          Enter the 6-digit code we sent to {prettyPhone(phone)}
        </p>
      </div>

      {/* Form */}
      <div className="px-8 py-8">
        <div className="space-y-5">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(cleaned);
              if (error) setError("");
            }}
            placeholder="123456"
            className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-xl border-2 border-mist focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/20 font-mono"
            aria-label="6-digit verification code"
          />

          {error && (
            <div className="rounded-md bg-error/8 border border-error/20 px-4 py-3">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {resentAt && !error && (
            <div className="rounded-md bg-emerald/8 border border-emerald/20 px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
              <p className="text-sm text-emerald font-medium">
                New code sent to your phone.
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="gold"
            size="lg"
            loading={verifying}
            disabled={code.length !== 6 || verifying}
            onClick={verify}
            className="w-full"
          >
            Verify code
            {!verifying && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>

        {/* Resend section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-light">
            Didn&apos;t get the code?{" "}
            <button
              type="button"
              onClick={resend}
              disabled={countdown > 0 || resending}
              className="text-violet font-semibold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
            >
              <RefreshCw className="inline h-3 w-3 mr-0.5" aria-hidden="true" />
              {countdown > 0
                ? `Resend in ${countdown}s`
                : resending
                ? "Sending…"
                : "Resend it"}
            </button>
          </p>
        </div>

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href="/login"
            className="text-slate-light hover:text-slate transition-colors"
          >
            Back to sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 text-royal hover:text-royal-dark font-medium transition-colors"
          >
            Wrong number?
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Trust footer */}
      <div className="border-t border-mist bg-cloud/50 px-8 py-4">
        <p className="text-xs text-slate-lighter text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald shrink-0" />
          Codes expire after 1 hour. We never charge for SMS receipt.
        </p>
      </div>
    </div>
  );
}

// Mask the middle digits of an E.164 Nigerian number so it's clear which
// phone the code went to without exposing the full number on screen.
//   +2348012345678  ->  +234 801 ** 5678
function prettyPhone(e164: string): string {
  if (!e164.startsWith("+234") || e164.length !== 14) return e164;
  return `+234 ${e164.slice(4, 7)} ** ${e164.slice(10, 14)}`;
}
