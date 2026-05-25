import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "How returns and refunds work on Winipat — escrow protection, evidence requirements, timelines, and what's eligible.",
};

export default function ReturnsPage() {
  return (
    <MarketingPageShell
      title="Returns & Refunds"
      intro="Because we hold payment in escrow until you confirm delivery, you have a real protection window — not just a polite refund policy."
    >
      <h2>Your protection window</h2>
      <p>
        After the courier marks the package delivered, you have <strong>48 hours</strong> to:
      </p>
      <ul>
        <li>Open the package</li>
        <li>Confirm everything is as described</li>
        <li>Either click <strong>Confirm Delivery</strong> or <strong>Open Dispute</strong></li>
      </ul>
      <p>
        If you do nothing within 48 hours, the system auto-confirms and escrow
        releases to the seller. So if anything looks off — open a dispute first,
        ask questions later.
      </p>

      <h2>What counts as a valid dispute reason</h2>
      <ul>
        <li><strong>Item not received</strong> — the courier marked delivered but you don&apos;t have the package</li>
        <li><strong>Wrong item</strong> — what arrived doesn&apos;t match the listing</li>
        <li><strong>Item not as described</strong> — wrong colour, wrong size, faulty</li>
        <li><strong>Damaged in transit</strong> — broken, water-damaged, etc.</li>
        <li><strong>Counterfeit</strong> — branded item is fake</li>
      </ul>

      <h2>What we&apos;ll need from you</h2>
      <p>
        Photo evidence is required for almost every dispute. Without it our team
        can&apos;t decide fairly between buyer and seller. Specifically:
      </p>
      <ul>
        <li>Wrong / damaged item → photo of what you received next to the listing</li>
        <li>Counterfeit → photos of branding, serial numbers, packaging</li>
        <li>Not received → screenshot of tracking + any conversations with courier</li>
      </ul>
      <p>
        Upload everything when you open the dispute. You can add more later from the
        order detail page.
      </p>

      <h2>How a dispute resolves</h2>
      <ol>
        <li>You open the dispute. Escrow is immediately frozen. Seller is notified.</li>
        <li>Seller has 48 hours to respond with their side (and their own evidence).</li>
        <li>Our team reviews both sides. Average resolution: 2–3 business days from when both parties have submitted.</li>
        <li>
          Outcome is one of: <strong>release to seller</strong>, <strong>full refund to buyer</strong>,{" "}
          <strong>partial refund</strong>, or <strong>return required</strong>.
        </li>
      </ol>

      <h2>When refunds hit your account</h2>
      <p>
        Approved refunds are issued back to the original payment method. Paystack
        usually settles refunds within 5–10 working days, depending on your bank.
        We email you when the refund is initiated and when Paystack confirms it
        completed.
      </p>

      <h2>What we don&apos;t refund</h2>
      <ul>
        <li><strong>Buyer&apos;s remorse</strong> — you ordered, it arrived as described, you changed your mind. Resell on the platform if you don&apos;t want it.</li>
        <li><strong>Disputes opened after the 48-hour confirmation window</strong> closed and escrow already released.</li>
        <li><strong>Damage caused after delivery</strong> — once it&apos;s in your hands.</li>
        <li><strong>Logistics fees</strong> — these go to the courier and are non-refundable for delivered orders.</li>
      </ul>

      <h2>Need to escalate?</h2>
      <p>
        If a dispute resolution doesn&apos;t feel right, email{" "}
        <a href="mailto:support@winipat.com">support@winipat.com</a> with your
        order number and we&apos;ll have a senior reviewer look at it. We&apos;ve
        reversed our own decisions before — it happens.
      </p>
    </MarketingPageShell>
  );
}
