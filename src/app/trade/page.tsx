import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Trade & Business Accounts",
  description:
    "Bulk-order pricing, dedicated account management, and invoice-based settlement for retailers, resellers, and corporate buyers on Winipat.",
};

export default function TradePage() {
  return (
    <MarketingPageShell
      title="Trade & Business Accounts"
      intro="If you're sourcing inventory, supplying a chain of stores, or buying in volume, the standard checkout isn't built for you. Trade accounts are."
    >
      <h2>Who this is for</h2>
      <ul>
        <li>Retailers reselling on physical or other online channels</li>
        <li>Corporate procurement (offices, hotels, schools)</li>
        <li>Logistics aggregators sourcing for fleets / sub-merchants</li>
        <li>Anyone buying the same SKU repeatedly or in MOQ-style quantities</li>
      </ul>

      <h2>What you get</h2>
      <ul>
        <li><strong>Bulk pricing tiers</strong> — sellers offer trade discounts at 10+, 50+, 100+ unit thresholds. Pricing locks in once your trade account is verified.</li>
        <li><strong>Dedicated account manager</strong> — one human, one email, one WhatsApp, no chat bots.</li>
        <li><strong>Invoice settlement</strong> — pay weekly or monthly against an invoice instead of card-on-checkout (subject to credit review).</li>
        <li><strong>Consolidated logistics</strong> — multiple SKUs from multiple sellers shipped on a single dispatch where geography allows.</li>
        <li><strong>Priority dispute handling</strong> — trade disputes reviewed within one business day.</li>
      </ul>

      <h2>What we need from you</h2>
      <p>
        Trade approval takes 3–5 business days. We&apos;ll need:
      </p>
      <ul>
        <li>CAC registration certificate (or BN for partnerships)</li>
        <li>Director/owner ID</li>
        <li>Recent 3-month bank statement (for invoice-credit applications)</li>
        <li>One trade reference if available (existing supplier, accountant, etc.)</li>
      </ul>
      <p>
        Smaller resellers with consistent platform spend can sometimes skip the
        bank-statement step — talk to us first.
      </p>

      <h2>Pricing</h2>
      <p>
        Trade accounts are <strong>free to open</strong>. The same 12% platform
        commission applies to sellers on trade orders; buyers don&apos;t pay extra
        fees beyond their negotiated unit pricing.
      </p>
      <p>
        Invoice-credit applications have a small underwriting fee (₦5,000, one-time)
        if approved. No fee if declined.
      </p>

      <h2>How to apply</h2>
      <p>
        Email <a href="mailto:support@winipat.com?subject=Trade%20account%20application">support@winipat.com</a> with the
        subject line "Trade account application" and a short paragraph describing
        your business and what you&apos;re sourcing. Attach the documents above.
        We&apos;ll reply with next steps within 2 business days.
      </p>
      <p>
        Already a trade buyer somewhere else and curious how Winipat&apos;s pricing
        compares? Send us a sample of your last 5 SKUs and quantities — we&apos;ll
        get a couple of our sellers to quote without commitment.
      </p>

      <h2>For wholesalers + distributors</h2>
      <p>
        If you supply <em>to</em> retailers (rather than buying from sellers), you can
        list as a regular seller and we&apos;ll mark your store as a Wholesale
        Supplier so trade buyers find you first. Same KYC; no extra paperwork.
      </p>
    </MarketingPageShell>
  );
}
