import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Common questions about how Winipat works — escrow, KYC, payouts, disputes, seller onboarding, fees.",
};

type FAQ = { q: string; a: React.ReactNode };

const FAQS: Record<string, FAQ[]> = {
  "Buying on Winipat": [
    {
      q: "Why is my money held in escrow instead of going to the seller?",
      a: (
        <>
          So you have leverage if anything goes wrong. Once the seller has
          delivered AND you&apos;ve confirmed (or the 48-hour window closes), escrow
          releases. Until then, if you open a dispute, those funds are frozen and
          our team reviews evidence from both sides.
        </>
      ),
    },
    {
      q: "What payment methods are accepted?",
      a: (
        <>
          All major Nigerian cards (Verve, Mastercard, Visa) via Paystack, plus
          bank transfer. We&apos;re rolling out USSD and Apple/Google Pay later this
          quarter.
        </>
      ),
    },
    {
      q: "How long does delivery actually take?",
      a: (
        <>
          Most Lagos-to-Lagos orders close in 2–3 working days. Lagos-to-Abuja
          averages 4–5. Anything taking more than 7 working days gets flagged and
          our team chases the seller or courier. See our{" "}
          <a href="/shipping">shipping page</a> for partner-specific estimates.
        </>
      ),
    },
    {
      q: "Can I cancel an order after paying?",
      a: (
        <>
          If the seller hasn&apos;t accepted yet, yes — full refund. After the seller
          accepts and starts preparing, you&apos;ll need to open a dispute citing a
          reason. We&apos;ll mediate.
        </>
      ),
    },
    {
      q: "Do I have to sign up to browse?",
      a: <>No. Browsing and viewing seller pages is open to everyone. You only need to register to add items to cart or contact a seller.</>,
    },
  ],
  "Selling on Winipat": [
    {
      q: "How do I become a verified seller?",
      a: (
        <>
          Sign up with role = Seller, then complete the onboarding flow: business
          info, pickup address, KYC documents (government ID + optional bank
          statement), bank account for payouts, accept the seller terms. Most
          applications are reviewed within 24 hours.
        </>
      ),
    },
    {
      q: "What does Winipat charge me?",
      a: (
        <>
          12% commission on delivered orders, deducted at settlement. No listing
          fees, no monthly fees, no charges if an order is refunded or disputed in
          the buyer&apos;s favour. Logistics fees go directly to the courier — we
          don&apos;t take a cut on those.
        </>
      ),
    },
    {
      q: "When do I get paid?",
      a: (
        <>
          48 hours after the buyer confirms delivery (or after the auto-confirm
          window closes). Payouts are batched daily to your registered bank
          account. You&apos;ll see your pending settlements live in the Earnings
          tab.
        </>
      ),
    },
    {
      q: "Can I list bulk products via CSV?",
      a: (
        <>
          Yes — Seller dashboard → Bulk Upload. Download our CSV template,
          fill it in, upload. Products are created as drafts so you can add
          images before publishing.
        </>
      ),
    },
    {
      q: "What happens if I miss the dispatch SLA?",
      a: (
        <>
          You have 24 hours to accept an order after payment, and 72 hours to mark
          it ready. Miss either, and our team is auto-notified. Repeated misses
          affect your trust score and badge eligibility.
        </>
      ),
    },
  ],
  "Account & Trust": [
    {
      q: "What does the Verified badge mean?",
      a: <>The seller has completed KYC (government ID + bank verification + phone). Every active seller on Winipat is verified — there&apos;s no other tier.</>,
    },
    {
      q: "What about the Trusted Seller / Fast Dispatch badges?",
      a: (
        <>
          Performance-based, recalculated nightly. Trusted Seller: 50+ reviews,
          4.5★+ average, dispute rate under 5%. Fast Dispatch: 10+ orders, 90%+
          on-time delivery rate. Badges are removed automatically if metrics
          slip.
        </>
      ),
    },
    {
      q: "I can&apos;t sign in / forgot my password",
      a: (
        <>
          Use the <a href="/forgot-password">password reset</a> flow. The reset
          email comes from support@winipat.com. Check spam if it doesn&apos;t arrive
          within 2 minutes.
        </>
      ),
    },
    {
      q: "How do I close my account?",
      a: <>Email <a href="mailto:support@winipat.com">support@winipat.com</a> from the address on file. We&apos;ll delete your data within 30 days as required by our <a href="/legal/privacy">privacy policy</a>.</>,
    },
  ],
  "Trade & Partnerships": [
    {
      q: "Do you offer trade accounts for businesses?",
      a: <>Yes. See our <a href="/trade">trade page</a> for details — bulk pricing, dedicated account manager, and invoice-based settlement available for verified businesses.</>,
    },
    {
      q: "Can my logistics company integrate with Winipat?",
      a: <>We&apos;re always open to new courier partners. Email <a href="mailto:support@winipat.com">support@winipat.com</a> with subject line "Logistics partnership" and we&apos;ll send the partner onboarding pack.</>,
    },
  ],
};

export default function FAQPage() {
  return (
    <MarketingPageShell
      title="Frequently Asked Questions"
      intro="Honest answers to the questions buyers and sellers actually ask. Can't find what you need? Email support@winipat.com."
    >
      {Object.entries(FAQS).map(([section, items]) => (
        <section key={section}>
          <h2>{section}</h2>
          <div className="space-y-4 not-prose">
            {items.map((item) => (
              <details
                key={item.q}
                className="group rounded-[--radius-md] border border-mist bg-white p-4 open:border-violet/30 open:bg-violet/5"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 text-midnight font-semibold text-[15px]">
                  <span>{item.q}</span>
                  <span className="text-violet text-xl leading-none shrink-0 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 text-[14px] text-slate-light leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <h2>Still stuck?</h2>
      <p>
        Email <a href="mailto:support@winipat.com">support@winipat.com</a> or fill
        in the <a href="/contact">contact form</a>. Mon–Fri 09:00–18:00 WAT, usually
        one business day for a real human reply.
      </p>
    </MarketingPageShell>
  );
}
