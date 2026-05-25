import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "About Winipat",
  description:
    "Why we built Winipat — an escrow-backed marketplace for Nigerian buyers and sellers tired of scams, ghost orders, and disputes that go nowhere.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      title="Built because trust shouldn't be the buyer's problem."
      intro="Winipat is a Lagos-built commerce platform that holds buyer money in escrow until the seller has actually delivered. Verified sellers only, evidence-based disputes, and your choice of delivery partner."
    >
      <h2>The problem we kept running into</h2>
      <p>
        Online shopping in Nigeria has a trust tax. Buyers send money and hope. Sellers
        send goods and hope. When something goes wrong — wrong item, late delivery,
        a vanished vendor — the dispute usually ends in a screenshot war on Twitter
        and no resolution.
      </p>
      <p>
        Winipat exists because we got tired of that. Money should sit somewhere safe
        until both sides have done their part. Sellers should be verified before they
        can list. And every package should be traceable from pickup to doorstep.
      </p>

      <h2>How escrow actually works on Winipat</h2>
      <ol>
        <li>Buyer pays via Paystack. Funds land in Winipat's escrow account, not the seller's.</li>
        <li>Seller is notified, accepts, prepares the order, uploads a package photo.</li>
        <li>Logistics partner (you pick: GIG, Sendbox, Kwik) picks up.</li>
        <li>Buyer confirms delivery. A 48-hour protection window starts.</li>
        <li>If no dispute is opened, the seller is paid out (minus a 12% commission).</li>
        <li>If a dispute IS opened, escrow stays frozen until our team reviews evidence from both sides.</li>
      </ol>

      <h2>Who&apos;s actually behind this</h2>
      <p>
        Winipat is operated by a small team in Lagos. We answer support emails ourselves.
        We review every seller application by hand for the first six months — no
        automated KYC rubber-stamping. If you want to know who reviewed your account,
        ask in your reply and we&apos;ll tell you.
      </p>

      <h2>What we won&apos;t do</h2>
      <ul>
        <li>List sellers we haven&apos;t verified (government ID + bank + phone).</li>
        <li>Release escrow before the protection window ends.</li>
        <li>Take a side in a dispute without seeing photo or video evidence.</li>
        <li>Hide our commission. It&apos;s 12% on delivered orders, full stop.</li>
        <li>Email you marketing junk. Transactional only.</li>
      </ul>

      <h2>How to reach us</h2>
      <p>
        Email <a href="mailto:support@winipat.com">support@winipat.com</a> or use the{" "}
        <a href="/contact">contact form</a>. We answer Mon–Fri 09:00–18:00 WAT,
        usually within one business day. For dispute escalations, mention your order
        number (starts with <code>WNP-</code>) and we&apos;ll prioritise.
      </p>
    </MarketingPageShell>
  );
}
