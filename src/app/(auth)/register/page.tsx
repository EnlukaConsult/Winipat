"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ShoppingBag,
  Store,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { AuthMarketing } from "@/components/auth/auth-marketing";
import { AuthCard } from "@/components/auth/auth-card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import {
  PasswordStrengthMeter,
  getPasswordStrength,
} from "@/components/auth/password-strength";

type Role = "buyer" | "seller";

// Two verification paths at signup. Email = classic confirmation link;
// Phone = 6-digit OTP sent via SMS. The form collects all the same
// fields either way (per the product decision) — only the confirmation
// channel differs. Password is required for email signups so they can
// sign back in later; phone signups don't need a password initially
// (sign in via OTP each time, or set a password in profile later).
type VerifyVia = "email" | "phone";

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  form?: string;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [verifyVia, setVerifyVia] = useState<VerifyVia>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const paramRole = searchParams.get("role");
    if (paramRole === "seller" || paramRole === "buyer") setRole(paramRole);
  }, [searchParams]);

  const strength = getPasswordStrength(password);
  const passwordsMatch = !!password && password === confirmPassword;
  // Email signups need a strong password + matching confirmation; phone
  // signups skip password (sign in via OTP each time, optional password
  // set later in profile).
  const passwordChecksPass =
    verifyVia === "email" ? strength.isStrong && passwordsMatch : true;
  const canSubmit =
    fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    /^(\+?234|0)[789]\d{9}$/.test(phone.replace(/\s/g, "")) &&
    passwordChecksPass &&
    acceptTerms;

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!fullName.trim()) next.full_name = "Full name is required.";
    else if (fullName.trim().length < 2)
      next.full_name = "Name must be at least 2 characters.";

    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";

    if (!phone.trim()) next.phone = "Phone number is required.";
    else if (!/^(\+?234|0)[789]\d{9}$/.test(phone.replace(/\s/g, "")))
      next.phone = "Enter a valid Nigerian phone number (e.g. 08012345678).";

    // Password rules only apply to email signups
    if (verifyVia === "email") {
      if (!strength.isStrong) {
        next.password = "Password doesn't meet all the criteria below.";
      }
      if (!confirmPassword) next.confirmPassword = "Confirm your password.";
      else if (confirmPassword !== password)
        next.confirmPassword = "Passwords don't match.";
    }

    if (!acceptTerms)
      next.terms = "Please accept the Terms & Conditions before continuing.";

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
      const origin =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const cleanedPhone = phone.replace(/\s/g, "");

      // ──────────────────────────────────────────────────────────
      // PHONE PATH — Supabase signInWithOtp sends a 6-digit SMS code
      // to the phone, then redirects to /verify-phone where the user
      // types it in. Requires Twilio (or another SMS provider) to be
      // enabled in Supabase Auth dashboard; will surface a clear
      // provider error here if not configured.
      // ──────────────────────────────────────────────────────────
      if (verifyVia === "phone") {
        const phoneE164 = toE164Nigeria(cleanedPhone);
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: phoneE164,
          options: {
            // shouldCreateUser: true is the default — creates a new
            // auth.users row on first OTP send if the phone is new.
            data: {
              full_name: fullName.trim(),
              email: email.trim(),
              phone: cleanedPhone,
              role,
            },
          },
        });
        if (otpError) {
          // Friendly mapping for the common "provider not enabled" case
          // so devs can spot the Twilio gap fast.
          const msg = otpError.message.toLowerCase();
          if (msg.includes("phone") && msg.includes("disabled")) {
            setErrors({
              form:
                "Phone signup isn't enabled yet on this site. Please use email instead, or contact support.",
            });
          } else if (msg.includes("already")) {
            setErrors({ phone: "An account with this phone already exists." });
          } else {
            setErrors({ form: otpError.message });
          }
          return;
        }
        router.push(
          `/verify-phone?phone=${encodeURIComponent(phoneE164)}`
        );
        return;
      }

      // ──────────────────────────────────────────────────────────
      // EMAIL PATH — classic supabase.auth.signUp with email + password
      // confirmation link via Resend, callback to /api/auth/callback.
      // ──────────────────────────────────────────────────────────
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: cleanedPhone,
            role,
          },
          emailRedirectTo: `${origin}/api/auth/callback`,
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

      if (data.user && data.session) {
        await supabase
          .from("profiles")
          .update({ phone: cleanedPhone })
          .eq("id", data.user.id);
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-10 lg:gap-16 items-start">
      <AuthMarketing />

      <AuthCard
        heading="Create secure account"
        subheading={
          verifyVia === "phone"
            ? "We'll send a 6-digit code to your phone to confirm"
            : "Use a strong password to protect your wallet and orders"
        }
        footerNote="Seller accounts undergo KYC verification before going live"
      >
        {errors.form && (
          <div className="mb-5 rounded-md bg-error/8 border border-error/20 px-4 py-3">
            <p className="text-sm text-error font-medium">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email / Phone verification toggle — picks how the
              confirmation will be delivered. Form fields are identical
              either way; only the verification channel differs. Password
              fields hide when phone is chosen. */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate">
              Verify with
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerifyVia("email")}
                aria-pressed={verifyVia === "email"}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all cursor-pointer min-h-[44px] ${
                  verifyVia === "email"
                    ? "border-violet bg-violet/5 text-violet"
                    : "border-mist text-slate-light hover:border-mist-dark"
                }`}
              >
                <Mail className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Email</p>
                  <p className="text-xs text-slate-lighter leading-tight mt-0.5">
                    Confirmation link
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVerifyVia("phone")}
                aria-pressed={verifyVia === "phone"}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all cursor-pointer min-h-[44px] ${
                  verifyVia === "phone"
                    ? "border-violet bg-violet/5 text-violet"
                    : "border-mist text-slate-light hover:border-mist-dark"
                }`}
              >
                <MessageSquare className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Phone</p>
                  <p className="text-xs text-slate-lighter leading-tight mt-0.5">
                    6-digit SMS code
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Buy / Sell role */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate">I want to</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all cursor-pointer min-h-[44px] ${
                  role === "buyer"
                    ? "border-violet bg-violet/5 text-violet"
                    : "border-mist text-slate-light hover:border-mist-dark"
                }`}
              >
                <ShoppingBag className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Buy</p>
                  <p className="text-xs text-slate-lighter leading-tight mt-0.5">
                    Shop safely
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all cursor-pointer min-h-[44px] ${
                  role === "seller"
                    ? "border-violet bg-violet/5 text-violet"
                    : "border-mist text-slate-light hover:border-mist-dark"
                }`}
              >
                <Store className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Sell</p>
                  <p className="text-xs text-slate-lighter leading-tight mt-0.5">
                    List products
                  </p>
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

          {/* Password fields — email verification only. Phone-verified
              users can set a password later in their profile if they
              want one; for now they sign in via OTP each time. */}
          {verifyVia === "email" ? (
            <>
              <div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
                {(password || strength.score > 0) && (
                  <PasswordStrengthMeter value={password} />
                )}
              </div>

              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                label="Confirm password"
                placeholder="Re-enter the same password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                icon={<Lock className="h-4 w-4" />}
              />
            </>
          ) : (
            <div className="rounded-md bg-teal/8 border border-teal/20 px-4 py-3 text-sm text-slate">
              <p className="font-semibold text-midnight flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-teal" aria-hidden="true" />
                We&apos;ll text a 6-digit code
              </p>
              <p className="mt-1 text-xs text-slate-light leading-relaxed">
                No password to remember &mdash; sign in via SMS each
                time. You can add a password later from your profile.
                Standard SMS rates may apply.
              </p>
            </div>
          )}

          {/* Terms checkbox */}
          <label
            htmlFor="acceptTerms"
            className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-colors ${
              errors.terms
                ? "border-error/50 bg-error/5"
                : acceptTerms
                ? "border-violet/30 bg-violet/5"
                : "border-mist hover:border-mist-dark"
            }`}
          >
            <input
              id="acceptTerms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                if (e.target.checked && errors.terms) {
                  setErrors((prev) => ({ ...prev, terms: undefined }));
                }
              }}
              className="sr-only peer"
              required
            />
            <span
              aria-hidden="true"
              className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-violet bg-white peer-checked:bg-gradient-to-br peer-checked:from-violet peer-checked:to-teal peer-checked:border-transparent flex items-center justify-center"
            >
              {acceptTerms && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M2 6.5l2.5 2.5L10 3.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="text-xs text-slate leading-relaxed">
              I agree to Winipat&apos;s{" "}
              <Link href="/legal/terms" target="_blank" className="text-violet font-semibold hover:underline">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" target="_blank" className="text-violet font-semibold hover:underline">
                Privacy Policy
              </Link>
              .
              <span className="block mt-1.5 text-slate-light">
                {role === "seller" ? (
                  <>
                    I understand Winipat <strong className="text-midnight">holds buyer funds in escrow</strong> until delivery is confirmed, and that I&apos;m bound by the{" "}
                    <Link href="/legal/seller-agreement" target="_blank" className="text-violet font-semibold hover:underline">
                      Seller Agreement
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    I understand my payments are{" "}
                    <strong className="text-midnight">protected by escrow</strong> and released to the seller only after I confirm delivery.
                  </>
                )}
              </span>
            </span>
          </label>

          {errors.terms && (
            <p className="text-xs text-error -mt-2" role="alert">
              {errors.terms}
            </p>
          )}

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={loading}
            disabled={!canSubmit || loading}
            className={`w-full ${
              !canSubmit
                ? "!bg-mist-dark !text-slate-lighter cursor-not-allowed hover:!bg-mist-dark !shadow-none"
                : ""
            }`}
            aria-disabled={!canSubmit}
          >
            Create Account
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-6">
          <OAuthButtons />
        </div>

        <p className="mt-6 text-center text-sm text-slate-light">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-violet hover:text-violet-dark transition-colors"
          >
            Sign in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-violet border-t-transparent rounded-full mx-auto" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

// ───────── helpers ─────────

// Supabase signInWithOtp expects E.164 phone format (+234 followed by
// 10 digits for Nigeria). The form accepts the common "08012345678" form
// too, so we normalise here. Returns the original if it doesn't look
// Nigerian — Supabase will reject it with a clear error.
function toE164Nigeria(input: string): string {
  const digits = input.replace(/\D/g, "");
  // Already +234... and 13 total chars when stripped of '+': leave alone
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  // "0" prefix Nigerian numbers (e.g. 08012345678): swap for +234
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  // Unknown — return as-is and let Supabase tell us why
  return input.startsWith("+") ? input : `+${digits}`;
}
