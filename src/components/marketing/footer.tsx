import Link from "next/link";
import { Mail, Globe, MapPin, Clock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="bg-midnight text-white/70 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand + contact block — spans 2 cols on desktop for breathing room */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-4" aria-label="Winipat home">
              <Logo size="md" theme="dark" />
            </Link>
            <p className="text-sm leading-relaxed mb-4 max-w-md">
              Trust-first commerce platform. Escrow-backed payments, KYC-verified
              sellers, your choice of courier. Built in Lagos.
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:support@winipat.com"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail size={14} className="text-gold shrink-0" />
                  support@winipat.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="text-gold shrink-0" />
                <span>Support: Mon–Fri 09:00–18:00 WAT</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-gold shrink-0" />
                <span>Operating in all 36 states + FCT</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe size={14} className="text-gold shrink-0" />
                <a href="https://winipat.com" className="hover:text-white transition-colors">
                  winipat.com
                </a>
              </li>
            </ul>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              Shop
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-white transition-colors">Get Started</Link></li>
              <li><Link href="/dashboard/browse" className="hover:text-white transition-colors">Browse Products</Link></li>
              <li><Link href="/track" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping &amp; Delivery</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors">Returns &amp; Refunds</Link></li>
            </ul>
          </div>

          {/* Sell */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              Sell
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register?role=seller" className="hover:text-white transition-colors">Apply to Sell</Link></li>
              <li><Link href="/#sellers" className="hover:text-white transition-colors">How Selling Works</Link></li>
              <li><Link href="/trade" className="hover:text-white transition-colors">Trade Accounts</Link></li>
              <li><Link href="/legal/seller-agreement" className="hover:text-white transition-colors">Seller Agreement</Link></li>
            </ul>
          </div>

          {/* Company / Support */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/legal/dispute-policy" className="hover:text-white transition-colors">Dispute Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Trust strip — payment + security badges */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-white/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald" />
                Escrow-protected payments
              </span>
              <span className="hidden sm:inline text-white/20">·</span>
              <span>Powered by Paystack</span>
              <span className="hidden sm:inline text-white/20">·</span>
              <span>SSL secured</span>
            </div>
            <p className="text-white/50">
              &copy; {new Date().getFullYear()} Winipat. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
