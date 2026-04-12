"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; form?: string }>({});

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/update-password`,
      });

      if (error) {
        setErrors({ form: error.message });
        return;
      }

      setSent(true);
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[--radius-lg] bg-emerald/20 border border-emerald/30 mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald" />
          </div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
            Check your inbox
          </h1>
          <p className="mt-1.5 text-sm text-white/60">
            We sent a reset link to your email
          </p>
        </div>

        <div className="px-8 py-8 text-center">
          <p className="text-slate mb-2 font-medium">Reset link sent to:</p>
          <p className="text-royal font-semibold mb-6 break-all">{email}</p>
          <p className="text-sm text-slate-light mb-8 leading-relaxed">
            Click the link in your email to reset your password. The link will
            expire in <span className="font-medium text-slate">1 hour</span>.
            Check your spam folder if you don&apos;t see it.
          </p>

          <Button
            variant="outline"
            size="md"
            className="w-full mb-4"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Try a different email
          </Button>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-light hover:text-slate transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>

        <div className="border-t border-mist bg-cloud/50 px-8 py-4">
          <p className="text-xs text-slate-lighter text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald shrink-0" />
            Reset links expire after 1 hour for your security
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
      {/* Card header */}
      <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-[--radius-lg] bg-gold/20 border border-gold/30 mb-4">
          <ShieldCheck className="h-7 w-7 text-gold" />
        </div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          Enter your email and we&apos;ll send a reset link
        </p>
      </div>

      {/* Form */}
      <div className="px-8 py-8">
        {errors.form && (
          <div className="mb-5 rounded-[--radius-md] bg-error/8 border border-error/20 px-4 py-3">
            <p className="text-sm text-error font-medium">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            id="email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={<Mail className="h-4 w-4" />}
          />

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Send Reset Link
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-light hover:text-slate transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>

      {/* Trust footer */}
      <div className="border-t border-mist bg-cloud/50 px-8 py-4">
        <p className="text-xs text-slate-lighter text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald shrink-0" />
          Reset links are single-use and expire after 1 hour
        </p>
      </div>
    </div>
  );
}
