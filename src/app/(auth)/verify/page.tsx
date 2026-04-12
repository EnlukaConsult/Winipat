"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ShieldCheck, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-royal border-t-transparent rounded-full mx-auto" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend throttle
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  async function handleResend() {
    if (!email || countdown > 0) return;
    setResending(true);
    setResendError("");
    setResent(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        },
      });

      if (error) {
        setResendError(error.message);
      } else {
        setResent(true);
        setCountdown(60); // 60s cooldown
      }
    } catch {
      setResendError("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
      {/* Card header */}
      <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
        <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-[--radius-lg] bg-royal/20 border border-royal/30 mb-4">
          <Mail className="h-7 w-7 text-royal-light" />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gold" />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
          Verify your email
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          One more step to activate your account
        </p>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <p className="text-slate mb-2">We sent a confirmation link to:</p>
          {email ? (
            <p className="text-royal font-semibold text-lg break-all">{email}</p>
          ) : (
            <p className="text-slate-light italic">your email address</p>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {[
            {
              step: "1",
              text: "Open the email from Winipat",
              done: false,
            },
            {
              step: "2",
              text: 'Click "Confirm your email" in the message',
              done: false,
            },
            {
              step: "3",
              text: "You'll be redirected to your dashboard",
              done: false,
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-royal/10 text-royal text-xs font-bold shrink-0 mt-0.5">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                ) : (
                  item.step
                )}
              </div>
              <p className="text-sm text-slate-light pt-1 leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Spam notice */}
        <div className="rounded-[--radius-md] bg-gold/8 border border-gold/20 px-4 py-3 mb-6">
          <p className="text-xs text-slate leading-relaxed">
            <span className="font-semibold">Didn&apos;t get it?</span> Check your
            spam or junk folder. Emails can take up to 2 minutes to arrive.
          </p>
        </div>

        {/* Resend section */}
        {resent ? (
          <div className="rounded-[--radius-md] bg-emerald/8 border border-emerald/20 px-4 py-3 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
            <p className="text-sm text-emerald font-medium">
              Confirmation email resent!
            </p>
          </div>
        ) : resendError ? (
          <div className="rounded-[--radius-md] bg-error/8 border border-error/20 px-4 py-3 mb-4">
            <p className="text-sm text-error">{resendError}</p>
          </div>
        ) : null}

        <Button
          variant="outline"
          size="md"
          onClick={handleResend}
          loading={resending}
          disabled={!email || countdown > 0}
          className="w-full mb-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {countdown > 0 ? `Resend in ${countdown}s` : "Resend confirmation email"}
        </Button>

        <div className="flex items-center justify-between text-sm">
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
            Wrong email?
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Trust footer */}
      <div className="border-t border-mist bg-cloud/50 px-8 py-4">
        <p className="text-xs text-slate-lighter text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald shrink-0" />
          Verification links expire after 24 hours for your security
        </p>
      </div>
    </div>
  );
}
