import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";
import { Logo, ShieldIcon } from "@/components/ui/logo";
import { Mail, MessageCircle, Clock, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Support",
  description:
    "Get in touch with the Winipat support team — order issues, KYC questions, partnerships, and feedback.",
};

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-cloud">
      {/* Header */}
      <header className="bg-white border-b border-mist">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" aria-label="Winipat home">
            <Logo size="md" theme="light" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs text-slate hover:text-violet">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-xs px-3 py-1.5 rounded-full bg-violet text-white hover:bg-violet-dark"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ===== Left: copy ===== */}
          <aside className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-midnight font-[family-name:var(--font-sora)]">
                Contact Support
              </h1>
              <p className="mt-2 text-sm text-slate-light leading-relaxed">
                We&apos;re here to help. Drop us a message and the Winipat team
                will get back to you — usually within one business day.
              </p>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-violet/10 text-violet flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-midnight">Email</p>
                  <a
                    href="mailto:support@winipat.com"
                    className="text-xs text-violet hover:underline"
                  >
                    support@winipat.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-teal/10 text-teal flex items-center justify-center shrink-0">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-midnight">Live chat</p>
                  <p className="text-xs text-slate-light">
                    Tap the chat bubble (bottom-right). Our AI assistant answers
                    instantly; complex questions get routed here.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald/10 text-emerald flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-midnight">Hours</p>
                  <p className="text-xs text-slate-light">
                    Mon–Fri 09:00–18:00 WAT. Out-of-hours messages are queued for
                    the next business day.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gold/10 text-gold-dark flex items-center justify-center shrink-0">
                  <ShieldIcon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-midnight">
                    Order or payment issue?
                  </p>
                  <p className="text-xs text-slate-light">
                    Include your order number (e.g.{" "}
                    <code className="bg-mist px-1 rounded">WNP-…</code>) and we&apos;ll
                    look it up immediately.
                  </p>
                </div>
              </li>
            </ul>

            <div className="rounded-[--radius-md] bg-violet/5 border border-violet/15 p-4">
              <p className="text-xs text-slate flex items-start gap-2">
                <ShieldCheck size={12} className="text-violet mt-0.5 shrink-0" />
                Your message is treated confidentially. We only share details
                with the relevant seller or logistics partner when needed to
                resolve your issue.
              </p>
            </div>
          </aside>

          {/* ===== Right: form ===== */}
          <section className="lg:col-span-3">
            <div className="rounded-[--radius-xl] bg-white border border-mist shadow-sm p-6 sm:p-8">
              <ContactForm />
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-mist mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-lighter">
          &copy; {new Date().getFullYear()} Winipat ·{" "}
          <a
            href="mailto:support@winipat.com"
            className="hover:text-violet"
          >
            support@winipat.com
          </a>{" "}
          · trust-first commerce for Nigeria
        </div>
      </footer>
    </div>
  );
}
