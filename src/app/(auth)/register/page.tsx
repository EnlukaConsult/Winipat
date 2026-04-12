"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
  Store,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Role = "buyer" | "seller";

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  form?: string;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const paramRole = searchParams.get("role");
    if (paramRole === "seller" || paramRole === "buyer") {
      setRole(paramRole);
    }
  }, [searchParams]);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!fullName.trim()) next.full_name = "Full name is required.";
    else if (fullName.trim().length < 2) next.full_name = "Name must be at least 2 characters.";

    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";

    if (!phone.trim()) next.phone = "Phone number is required.";
    else if (!/^(\+?234|0)[789]\d{9}$/.test(phone.replace(/\s/g, "")))
      next.phone = "Enter a valid Nigerian phone number (e.g. 08012345678).";

    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(password)) next.password = "Include at least one uppercase letter.";
    else if (!/\d/.test(password)) next.password = "Include at least one number.";

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

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.replace(/\s/g, ""),
            role,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setErrors({ email: "An account with this email already exists." });
        } else {
          setErrors({ form: signUpError.message });
        }
        return;
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          phone: phone.replace(/\s/g, ""),
          role,
          email,
        });
      }

      // If session exists (email confirmation disabled), go straight to dashboard
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        // Email confirmation required — show verify page
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 overflow-hidden">
      <div className="bg-gradient-to-br from-midnight to-midnight-lighter px-8 py-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-[--radius-lg] bg-gold/20 border border-gold/30 mb-4">
          <ShieldCheck className="h-7 w-7 text-gold" />
        </div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-sora)]">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          Join Winipat — trust-first commerce for Nigeria
        </p>
      </div>

      <div className="px-8 py-8">
        {errors.form && (
          <div className="mb-5 rounded-[--radius-md] bg-error/8 border border-error/20 px-4 py-3">
            <p className="text-sm text-error font-medium">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate">I want to</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`flex items-center gap-3 rounded-[--radius-md] border-2 px-4 py-3.5 text-left transition-all duration-200 cursor-pointer ${
                  role === "buyer"
                    ? "border-royal bg-royal/5 text-royal"
                    : "border-mist text-slate-light hover:border-mist-dark"
                }`}
              >
                <ShoppingBag className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Buy</p>
                  <p className="text-xs text-slate-lighter leading-tight mt-0.5">Shop safely</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`flex items-center gap-3 rounded-[--radius-md] border-2 px-4 py-3.5 text-left transition-all duration-200 cursor-pointer ${
                  role === "seller"
                    ? "border-royal bg-royal/5 text-royal"
                    : "border-mist text-slate-light hover:border-mist-dark"
                }`}
              >
                <Store className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Sell</p>
                  <p className="text-xs text-slate-lighter leading-tight mt-0.5">List products</p>
                </div>
              </button>
            </div>
          </div>

          <Input
            id="full_name"
            type="text"
            label="Full name"
            placeholder="Chidi Okafor"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.full_name}
            icon={<User className="h-4 w-4" />}
          />

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
            id="phone"
            type="tel"
            label="Phone number"
            placeholder="08012345678"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            icon={<Phone className="h-4 w-4" />}
          />

          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            label="Password"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={<Lock className="h-4 w-4" />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer hover:text-slate transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <p className="text-xs text-slate-lighter leading-relaxed">
            By creating an account, you agree to Winipat&apos;s{" "}
            <Link href="/terms" className="text-royal hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-royal hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Create Account
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-light">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-royal hover:text-royal-dark transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="border-t border-mist bg-cloud/50 px-8 py-4">
        <p className="text-xs text-slate-lighter text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald shrink-0" />
          Seller accounts undergo KYC verification before going live
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[--radius-xl] bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-royal border-t-transparent rounded-full mx-auto" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
