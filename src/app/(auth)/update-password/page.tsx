"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

// Reached via /api/auth/callback after a successful password-recovery
// verifyOtp. The session at this point is a short-lived "recovery" session
// — valid for updating the password but nothing else. If the user lands
// here without that session (link expired, opened in wrong context), we
// redirect them back to /forgot-password to start over.
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // No session = link expired / not from a recovery click. Push them
        // back to the start so they don't get a confusing form-with-no-effect.
        router.replace("/forgot-password?error=expired");
        return;
      }
      setCheckingSession(false);
    });
  }, [router]);

  function validate() {
    const next: typeof errors = {};
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
    if (!confirm) next.confirm = "Confirm the new password.";
    else if (password && confirm !== password) next.confirm = "Passwords don't match.";
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrors({ form: error.message });
        return;
      }
      setDone(true);
      // Short pause so the user sees the success state, then off to login.
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-royal border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[--radius-lg] bg-emerald/20 border border-emerald/30 mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald" />
          </div>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
            Password updated
          </h1>
          <p className="mt-1.5 text-sm text-white/60">
            Redirecting you to sign in&hellip;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
      <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-[--radius-lg] bg-gold/20 border border-gold/30 mb-4">
          <ShieldCheck className="h-7 w-7 text-gold" />
        </div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
          Set a new password
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          Pick something you haven&apos;t used before
        </p>
      </div>

      <div className="px-8 py-8">
        {errors.form && (
          <div className="mb-5 rounded-[--radius-md] bg-error/8 border border-error/20 px-4 py-3">
            <p className="text-sm text-error font-medium">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            id="password"
            type={show ? "text" : "password"}
            label="New password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={<Lock className="h-4 w-4" />}
            suffix={
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-slate-light hover:text-slate pointer-events-auto"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <Input
            id="confirm"
            type={show ? "text" : "password"}
            label="Confirm password"
            placeholder="Re-enter the same password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            icon={<Lock className="h-4 w-4" />}
          />

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Update password
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

      <div className="border-t border-mist bg-cloud/50 px-8 py-4">
        <p className="text-xs text-slate-lighter text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald shrink-0" />
          Your new password is hashed and stored securely
        </p>
      </div>
    </div>
  );
}
