"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { AuthMarketing } from "@/components/auth/auth-marketing";
import { AuthCard } from "@/components/auth/auth-card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  // Pre-fill from the callback's confirmation_failed redirect
  const urlError = searchParams.get("error");
  const initialBanner =
    urlError === "confirmation_failed"
      ? "Verification link expired or already used. Please sign in or request a fresh link."
      : null;

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes("invalid")) {
          setErrors({
            form: "Incorrect email or password. Please try again.",
          });
        } else if (error.message.toLowerCase().includes("confirm")) {
          setErrors({ form: "Please verify your email before signing in." });
        } else {
          setErrors({ form: error.message });
        }
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const formError = errors.form ?? initialBanner;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-10 lg:gap-16 items-start">
      <AuthMarketing />

      <AuthCard
        heading="Welcome back"
        subheading="Sign in to your Winipat account to continue"
      >
        {formError && (
          <div className="mb-5 rounded-md bg-error/8 border border-error/20 px-4 py-3">
            <p className="text-sm text-error font-medium">{formError}</p>
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

          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            label="Password"
            placeholder="Your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={<Lock className="h-4 w-4" />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer hover:text-slate transition-colors pointer-events-auto"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />

          <div className="flex justify-end -mt-2">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-violet hover:text-violet-dark transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Sign In
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-6">
          <OAuthButtons />
        </div>

        <p className="mt-6 text-center text-sm text-slate-light">
          New to Winipat?{" "}
          <Link
            href="/register"
            className="font-semibold text-violet hover:text-violet-dark transition-colors"
          >
            Create an account
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-violet border-t-transparent rounded-full mx-auto" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
