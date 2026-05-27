import type { Metadata } from "next";
import { LegalDocument, Section, Para, Bullets } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Seller Agreement",
  description: "The terms that govern selling on Winipat.",
};

export default function SellerAgreementPage() {
  return (
    <LegalDocument
      title="Seller Agreement"
      effectiveDate="24 May 2026"
      intro="This Seller Agreement (the &quot;Agreement&quot;) sets out the specific rights and obligations of sellers on the Winipat platform. It supplements (and forms part of) our Terms of Service."
    >
      <Section number={1} title="Eligibility to Sell">
        <Bullets>
          <li>You must be at least 18 years old and have legal capacity to enter into binding contracts in Nigeria</li>
          <li>You must operate a legitimate business and comply with all applicable licences and registrations</li>
          <li>Companies and registered businesses are welcome; sole traders are too</li>
          <li>Your account must complete KYC verification (see Section 2) before you can list products</li>
        </Bullets>
      </Section>

      <Section number={2} title="KYC (Know Your Customer) Verification">
        <Para>Before approving your seller account, Winipat requires:</Para>
        <Bullets>
          <li><strong className="text-midnight">Business information:</strong> business name, description, pickup address (street, city, state)</li>
          <li><strong className="text-midnight">Identity document:</strong> government-issued ID — NIN slip, international passport, driver&apos;s licence, or voter&apos;s card</li>
          <li><strong className="text-midnight">Bank account:</strong> NUBAN account number, bank name, name on the account. The name must match the seller&apos;s legal name and is verified via Paystack</li>
          <li><strong className="text-midnight">Optional utility bill:</strong> a recent electricity, waste, or water bill showing the pickup address. Used to verify the seller&apos;s location. Replaced the older bank-statement requirement that many Nigerian sellers preferred not to share.</li>
          <li><strong className="text-midnight">Acceptance of agreements:</strong> this Seller Agreement and our Escrow Policy (see Section 4)</li>
        </Bullets>
        <Para>
          KYC is normally reviewed within 1-2 business days. If rejected, you may appeal once with
          updated information. Periodic re-verification may be requested (typically annually or when
          we detect material changes).
        </Para>
      </Section>

      <Section number={3} title="Product Listings">
        <Bullets>
          <li>All product details (title, description, price, stock, images) must be accurate and up to date</li>
          <li>Minimum one product image; up to 8 images per product (max 5 MB each)</li>
          <li>One optional product video (max 60 seconds, 50 MB)</li>
          <li>Designate a cover/thumbnail image — defaults to the first image uploaded</li>
          <li>Maintain real-time stock levels — products with zero stock are not purchasable</li>
          <li>Every product listing requires admin moderation before going live. Approval is usually within 1 business day; trusted sellers may receive expedited approval</li>
          <li>Prohibited products (counterfeits, illegal items, restricted items) will be removed and may result in suspension</li>
        </Bullets>
      </Section>

      <Section number={4} title="Commission, Escrow & Payouts">
        <Para><strong className="text-midnight">Commission:</strong> 12% of the order total, deducted at settlement.</Para>

        <Para><strong className="text-midnight">Escrow flow:</strong></Para>
        <Bullets>
          <li>Buyer pays at checkout; funds are held in escrow by Winipat (not by you)</li>
          <li>You accept the order within 15 minutes (configurable platform SLA)</li>
          <li>You prepare and mark the order Ready for Pickup; optional packaging photo for evidence</li>
          <li>Buyer-chosen logistics partner collects and delivers</li>
          <li>Buyer confirms delivery, or 48 hours auto-confirms after delivery</li>
          <li>Escrow releases after the 48-hour hold (assuming no dispute)</li>
        </Bullets>

        <Para><strong className="text-midnight">Payouts:</strong></Para>
        <Bullets>
          <li>Daily automated batch transfers to your verified bank account</li>
          <li>Net of 12% commission</li>
          <li>Reference number provided for every payout</li>
          <li>Payouts may be temporarily suspended if you are under fraud investigation; resumption requires Finance approval</li>
        </Bullets>

        <Para>
          You can configure per-product escrow hold duration within platform-set minimum and maximum limits.
        </Para>
      </Section>

      <Section number={5} title="Orders & Fulfilment">
        <Bullets>
          <li>You must accept or reject orders within the SLA (default 15 minutes). Non-response results in automatic cancellation and may affect your seller rating</li>
          <li>Mark orders Ready for Pickup before the logistics partner can act</li>
          <li>Real-time order tracking is available to you and the buyer</li>
          <li>You must respond to delivery exceptions promptly</li>
        </Bullets>
      </Section>

      <Section number={6} title="Disputes">
        <Para>
          Buyer disputes will be communicated to you with the category and explanation. You must
          respond within the seller dispute SLA with relevant evidence (packaging photos, shipping
          proof, communication trail). Non-response within SLA may result in automatic ruling against
          you, including refund of the order in full.
        </Para>
        <Para>
          Sellers exceeding platform dispute-rate thresholds may face increased moderation, escrow
          restrictions, or account suspension. Counterfeit or prohibited-product rulings may result in
          permanent suspension.
        </Para>
        <Para>
          Refer to our <a href="/legal/dispute-policy" className="text-royal underline">Dispute Policy</a> for full details.
        </Para>
      </Section>

      <Section number={7} title="Trust & Reputation">
        <Para>
          Winipat awards trust badges based on performance:
        </Para>
        <Bullets>
          <li><strong className="text-midnight">Verified</strong> — KYC complete</li>
          <li><strong className="text-midnight">Fast Dispatch</strong> — ≥90% of orders marked Ready for Pickup within 24 hours</li>
          <li><strong className="text-midnight">Trusted Seller</strong> — ≥25 completed orders, ≥4.5 average rating, ≤2% dispute rate</li>
        </Bullets>
        <Para>Thresholds may be adjusted from time to time.</Para>
      </Section>

      <Section number={8} title="Communication Rules">
        <Bullets>
          <li>Use the in-app messaging system to communicate with buyers</li>
          <li>Do not share phone numbers, emails, social media handles, or external links with buyers — Winipat&apos;s system automatically masks these to prevent off-platform transactions</li>
          <li>Off-platform transaction attempts are a serious violation and may result in permanent suspension and forfeiture of pending payouts</li>
        </Bullets>
      </Section>

      <Section number={9} title="Account Suspension & Termination">
        <Para>Winipat may suspend or terminate your seller account for:</Para>
        <Bullets>
          <li>Policy violations (prohibited products, off-platform attempts, etc.)</li>
          <li>Fraud or attempted fraud</li>
          <li>Pattern of failed deliveries or unresolved disputes</li>
          <li>Bankruptcy or insolvency</li>
          <li>Inactivity for an extended period</li>
        </Bullets>
        <Para>
          On termination, any escrow funds not subject to active disputes will be paid out per the
          standard schedule. You may appeal a suspension once.
        </Para>
      </Section>

      <Section number={10} title="Indemnity">
        <Para>
          You agree to indemnify and hold Winipat harmless from claims, damages, and expenses
          (including reasonable legal fees) arising from your products, your conduct on the Platform,
          or your breach of this Agreement.
        </Para>
      </Section>

      <Section number={11} title="Taxes">
        <Para>
          You are solely responsible for accounting for and paying all taxes (VAT, income tax, etc.)
          on your sales. Winipat may be required to provide transactional records to tax authorities
          on request.
        </Para>
      </Section>

      <Section number={12} title="Changes to this Agreement">
        <Para>
          Winipat may update this Agreement. Material changes will be notified at least 14 days in
          advance. Continued use of the seller portal after the effective date constitutes acceptance.
        </Para>
      </Section>
    </LegalDocument>
  );
}
