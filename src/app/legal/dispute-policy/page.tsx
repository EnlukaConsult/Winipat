import type { Metadata } from "next";
import { LegalDocument, Section, Para, Bullets } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Dispute Policy",
  description: "How disputes work on Winipat — opening, evidence, timelines, and outcomes.",
};

export default function DisputePolicyPage() {
  return (
    <LegalDocument
      title="Dispute Policy"
      effectiveDate="24 May 2026"
      intro="Winipat&apos;s escrow model is built so that disputes can be resolved fairly. This policy explains when and how to open a dispute, what evidence is needed, what timelines apply, and what outcomes are possible."
    >
      <Section number={1} title="When You Can Open a Dispute">
        <Para>
          As a buyer, you may open a dispute on any order in one of these states:
        </Para>
        <Bullets>
          <li><strong className="text-midnight">Picked Up / In Transit</strong> — package never arrives, logistics partner says it&apos;s lost or stuck</li>
          <li><strong className="text-midnight">Delivered</strong> — package arrived but the item is wrong, damaged, missing, counterfeit, or materially different from the listing</li>
        </Bullets>
        <Para>
          You must open the dispute within 48 hours of delivery — after that, the order is
          auto-confirmed and funds are released to the seller.
        </Para>
      </Section>

      <Section number={2} title="How to Open a Dispute">
        <Bullets>
          <li>Sign in to Winipat → Dashboard → Orders</li>
          <li>Click on the relevant order → click <strong className="text-midnight">Open Dispute</strong></li>
          <li>Pick a reason from the dropdown (item not received, wrong item, damaged, not as described, counterfeit, other)</li>
          <li>Describe what went wrong in your own words — be specific and factual</li>
          <li>Click Submit Dispute</li>
        </Bullets>
        <Para>
          As soon as a dispute is opened, the order is flagged Disputed and the escrow funds are
          frozen — the seller cannot be paid until the dispute is resolved.
        </Para>
      </Section>

      <Section number={3} title="Evidence Requirements">
        <Para><strong className="text-midnight">Buyers should provide:</strong></Para>
        <Bullets>
          <li>Photos of the received item showing the defect or difference from the listing</li>
          <li>Photos of the packaging if relevant (e.g. damaged box)</li>
          <li>The original product page screenshot or link, if available</li>
          <li>Any conversation history with the seller</li>
        </Bullets>

        <Para><strong className="text-midnight">Sellers should provide:</strong></Para>
        <Bullets>
          <li>Pre-pickup photos showing the item packaged and intact</li>
          <li>Logistics handover confirmation (waybill, tracking screenshot, photo)</li>
          <li>Proof of any communication with the buyer</li>
          <li>For counterfeit claims: proof of authenticity / source documentation</li>
        </Bullets>
        <Para>
          Evidence is uploaded via the dispute UI. Each party can also send messages through the
          dispute thread. <strong className="text-midnight">For confidentiality reasons, parties do
          not see each other&apos;s evidence directly</strong> — only the Winipat admin reviewing
          the dispute does.
        </Para>
      </Section>

      <Section number={4} title="Timelines & SLAs">
        <Bullets>
          <li><strong className="text-midnight">Dispute opens:</strong> 48-hour window after delivery</li>
          <li><strong className="text-midnight">Seller must respond:</strong> within their dispute SLA (currently 72 hours). Non-response is treated as accepting the buyer&apos;s claim</li>
          <li><strong className="text-midnight">Admin review:</strong> typically within 3-5 business days of all evidence being received</li>
          <li><strong className="text-midnight">Resolution:</strong> communicated to both parties via email + in-app notification</li>
        </Bullets>
      </Section>

      <Section number={5} title="Possible Outcomes">
        <Para>The Winipat admin team will issue one of the following decisions:</Para>
        <Bullets>
          <li><strong className="text-midnight">Full refund to buyer</strong> — escrow returned to buyer; seller receives nothing</li>
          <li><strong className="text-midnight">Partial refund</strong> — agreed split between buyer and seller; useful for items received but materially different from listing</li>
          <li><strong className="text-midnight">Release to seller</strong> — when evidence shows the seller fulfilled correctly and the dispute is unsupported</li>
          <li><strong className="text-midnight">Return-for-refund</strong> — buyer returns the item (at seller&apos;s expense) before refund is processed</li>
          <li><strong className="text-midnight">Escalation</strong> — for complex cases, the dispute may be escalated for senior review</li>
        </Bullets>
        <Para>
          Refunds, when due, are processed back to the original payment method within 5-10 business
          days depending on the bank.
        </Para>
      </Section>

      <Section number={6} title="Seller Penalties">
        <Para>Sellers who repeatedly lose disputes may face:</Para>
        <Bullets>
          <li>Escrow hold extensions on future orders (longer release period)</li>
          <li>Increased product moderation requirements</li>
          <li>Loss of trust badges</li>
          <li>Temporary or permanent suspension of selling privileges</li>
          <li>Forfeiture of pending payouts in cases of confirmed fraud or counterfeit</li>
        </Bullets>
      </Section>

      <Section number={7} title="Buyer Misuse">
        <Para>
          Disputes opened in bad faith — to extract refunds for items received as described, or
          to harass sellers — are also taken seriously. Buyers with patterns of unsupported disputes
          may have their accounts restricted or terminated. Repeat offences may be reported to
          relevant authorities where fraud is established.
        </Para>
      </Section>

      <Section number={8} title="Finality of Decisions">
        <Para>
          All dispute decisions issued by the Winipat admin team are final. Parties may request a
          single review of a decision within 7 days if new material evidence has emerged; reviews
          are at Winipat&apos;s discretion.
        </Para>
        <Para>
          Nothing in this Policy prevents either party from pursuing remedies in a court of competent
          jurisdiction in Nigeria, but any escrow funds released to one party in accordance with this
          Policy will not be re-credited absent a court order.
        </Para>
      </Section>

      <Section number={9} title="Cancellations vs Disputes">
        <Para>
          For orders that <strong className="text-midnight">have not yet been picked up</strong> by
          logistics, cancellation is the right route (not a dispute):
        </Para>
        <Bullets>
          <li>Within 15 minutes of placing — instant cancellation, full refund</li>
          <li>Seller has accepted but not marked Ready for Pickup — request cancellation via the order detail page</li>
          <li>Seller has marked Ready for Pickup — cancellation may require seller agreement; if denied, you can wait for delivery and then open a dispute if needed</li>
        </Bullets>
      </Section>

      <Section number={10} title="Questions">
        <Para>
          If you need help with a dispute or are not sure whether to open one, email{" "}
          <a href="mailto:support@winipat.com" className="text-royal underline">support@winipat.com</a>{" "}
          with your order number. Our team will guide you.
        </Para>
      </Section>
    </LegalDocument>
  );
}
