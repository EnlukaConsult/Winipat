"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  ShoppingBag,
  Store,
  ArrowRight,
  User,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";

type Role = "buyer" | "seller";
type SellerType = "individual" | "business";

// Post-OAuth onboarding. Google signup gives us an email and a name —
// nothing else. Sellers especially need a phone (required for KYC) and
// an explicit role choice. Password signups skip this page entirely
// because they collected the same fields on /register.
export default function WelcomePage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("buyer");
  const [sellerType, setSellerType] = useState<SellerType>("individual");
  const [phone, setPhone] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errors, setErrors] = useState<{
    phone?: string;
    seller_type?: string;
    terms?: string;
    form?: string;
  }>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Not signed in — got here directly somehow. Send back to sign in.
        router.replace("/login");
        return;
      }
      const meta = data.session.user.user_metadata ?? {};
      setName(
        (meta.full_name as string) ??
          (meta.name as string) ??
          data.session.user.email?.split("@")[0] ??
          ""
      );
      setChecking(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: typeof errors = {};
    if (!phone.trim()) fieldErrors.phone = "Phone number is required.";
    else if (!/^(\+?234|0)[789]\d{9}$/.test(phone.replace(/\s/g, "")))
      fieldErrors.phone =
        "Enter a valid Nigerian phone number (e.g. 08012345678).";
    if (!acceptTerms)
      fieldErrors.terms = "Please accept the Terms before continuing.";

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          phone: phone.replace(/\s/g, ""),
          ...(role === "seller" ? { seller_type: sellerType } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({
          form: body.error || "Couldn't save your details. Please try again.",
        });
        return;
      }

      // Route to role's landing. Sellers go to the seller portal home so the
      // KYC walkthrough kicks in immediately; buyers go straight to browse.
      const landing = role === "seller" ? "/seller" : "/dashboard/browse";
      router.push(landing);
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="max-w-md mx-auto rounded-3xl bg-white/95 shadow-2xl border border-white/20 p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-violet border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <AuthCard
        heading={name ? `Welcome, ${name.split(" ")[0]}!` : "Welcome!"}
        subheading="Just two more questions so we can set things up correctly"
        footerNote="Sellers complete KYC verification before going live"
      >
        {errors.form && (
          <div className="mb-5 rounded-md bg-error/8 border border-error/20 px-4 py-3">
            <p className="text-sm text-error font-medium">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Role picker */}
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
                aria-pressed={role === "buyer"}
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
                aria-pressed={role === "seller"}
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
            {role === "seller" && (
              <p className="mt-2 text-xs text-slate-light">
                Heads-up: sellers must complete a quick KYC step (government ID
                + bank details) before listing.
              </p>
            )}
          </div>

          {/* Seller-only: individual vs business. Surfaced here so we can
              route the right KYC docs later (CAC for business, ID-only
              for individual). Only persisted when role === 'seller'. */}
          {role === "seller" && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate">Seller type</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSellerType("individual")}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all cursor-pointer min-h-[44px] ${
                    sellerType === "individual"
                      ? "border-violet bg-violet/5 text-violet"
                      : "border-mist text-slate-light hover:border-mist-dark"
                  }`}
                  aria-pressed={sellerType === "individual"}
                >
                  <User className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      Individual
                    </p>
                    <p className="text-xs text-slate-lighter leading-tight mt-0.5">
                      Sole trader
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSellerType("business")}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all cursor-pointer min-h-[44px] ${
                    sellerType === "business"
                      ? "border-violet bg-violet/5 text-violet"
                      : "border-mist text-slate-light hover:border-mist-dark"
                  }`}
                  aria-pressed={sellerType === "business"}
                >
                  <Building2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      Business
                    </p>
                    <p className="text-xs text-slate-lighter leading-tight mt-0.5">
                      CAC-registered
                    </p>
                  </div>
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-light">
                {sellerType === "business"
                  ? "You'll need a CAC certificate at KYC."
                  : "Government ID is enough at KYC for sole traders."}
              </p>
            </div>
          )}

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

          {/* Terms */}
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
                if (e.target.checked && errors.terms)
                  setErrors((prev) => ({ ...prev, terms: undefined }));
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
              {role === "seller" && (
                <span className="block mt-1.5 text-slate-light">
                  Including the{" "}
                  <Link
                    href="/legal/seller-agreement"
                    target="_blank"
                    className="text-violet font-semibold hover:underline"
                  >
                    Seller Agreement
                  </Link>{" "}
                  — Winipat holds buyer funds in escrow until delivery is
                  confirmed.
                </span>
              )}
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
            disabled={loading}
            className="w-full"
          >
            Continue
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
