import type { Metadata } from "next";
import { LegalDocument, Section, Para, Bullets } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules and responsibilities for using the Winipat platform.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      effectiveDate="24 May 2026"
      intro="These Terms of Service (&quot;Terms&quot;) govern your access to and use of Winipat — a trust-first commerce platform connecting buyers, verified sellers, and logistics partners across Nigeria. By creating an account or using the platform, you agree to these Terms."
    >
      <Section number={1} title="Acceptance of these Terms">
        <Para>
          By registering for or using Winipat (the &quot;Platform&quot;, accessible at winipat.com),
          you confirm that you have read, understood, and agreed to be bound by these Terms,
          our <a href="/legal/privacy" className="text-royal underline">Privacy Policy</a>,
          and where applicable, our <a href="/legal/seller-agreement" className="text-royal underline">Seller Agreement</a>
          and <a href="/legal/dispute-policy" className="text-royal underline">Dispute Policy</a>.
        </Para>
      </Section>

      <Section number={2} title="Eligibility">
        <Para>
          You must be at least 18 years old, have legal capacity to enter into binding contracts under
          Nigerian law, and provide accurate information when creating your account. Winipat reserves
          the right to refuse service, suspend, or terminate accounts that do not meet these criteria.
        </Para>
      </Section>

      <Section number={3} title="Account Registration & Security">
        <Bullets>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You must notify us immediately at <a href="mailto:support@winipat.com" className="text-royal underline">support@winipat.com</a> of any unauthorised access.</li>
          <li>One account per person. Multiple accounts for the same individual may be merged or suspended.</li>
          <li>Account information must be accurate, current, and complete.</li>
        </Bullets>
      </Section>

      <Section number={4} title="Buyer Responsibilities">
        <Bullets>
          <li>Pay for orders in full at checkout via supported payment methods.</li>
          <li>Provide accurate delivery information.</li>
          <li>Choose a logistics partner at checkout and pay applicable fees.</li>
          <li>Confirm delivery within 48 hours of receipt, or it will be auto-confirmed.</li>
          <li>Open disputes in good faith and only when warranted (see Dispute Policy).</li>
        </Bullets>
      </Section>

      <Section number={5} title="Seller Responsibilities">
        <Bullets>
          <li>Complete KYC verification before listing any product.</li>
          <li>Accurately describe products, including condition, materials, and dimensions.</li>
          <li>Accept or reject orders within 15 minutes; prepare and mark Ready for Pickup promptly.</li>
          <li>Respond to disputes with evidence within stated SLAs.</li>
          <li>Comply with all applicable Nigerian laws including consumer protection.</li>
        </Bullets>
        <Para>
          Sellers must also comply with the <a href="/legal/seller-agreement" className="text-royal underline">Seller Agreement</a>, which forms part of these Terms.
        </Para>
      </Section>

      <Section number={6} title="Payments & Escrow">
        <Para>
          All payments are processed through licensed Nigerian payment providers (Paystack). When you
          pay for an order, your funds are held in escrow by Winipat. Funds are released to the seller
          only after:
        </Para>
        <Bullets>
          <li>You confirm delivery, OR</li>
          <li>48 hours pass after delivery without a dispute being opened, OR</li>
          <li>A dispute is resolved in the seller&apos;s favour.</li>
        </Bullets>
        <Para>
          Winipat deducts a 12% platform commission from each completed order before remitting the
          net amount to the seller.
        </Para>
      </Section>

      <Section number={7} title="Logistics & Delivery">
        <Para>
          Winipat partners with independent logistics providers. You select your preferred logistics
          partner at checkout. Delivery times, pricing, and service levels are set by the logistics
          partner. Winipat is not liable for delays, damages, or losses caused by logistics partners,
          though we will facilitate dispute resolution.
        </Para>
      </Section>

      <Section number={8} title="Disputes & Refunds">
        <Para>
          The full dispute process is described in our{" "}
          <a href="/legal/dispute-policy" className="text-royal underline">Dispute Policy</a>.
          In summary: buyers may open a dispute within 48 hours of delivery. Sellers must respond with
          evidence within SLA. Winipat will review evidence and may issue full refunds, partial
          refunds, or release funds to the seller. Decisions are final.
        </Para>
      </Section>

      <Section number={9} title="Prohibited Products & Conduct">
        <Para>The following are not permitted on Winipat:</Para>
        <Bullets>
          <li>Counterfeit goods or items infringing intellectual property rights</li>
          <li>Illegal substances, weapons, or items restricted under Nigerian law</li>
          <li>Stolen goods</li>
          <li>Adult content, gambling products, or items requiring licences the seller does not hold</li>
          <li>Off-platform transaction attempts (sharing contact details to bypass escrow)</li>
          <li>Manipulation of reviews, ratings, or dispute outcomes</li>
        </Bullets>
        <Para>
          Violations may result in product removal, account suspension, or permanent ban, with no
          obligation to refund any platform fees.
        </Para>
      </Section>

      <Section number={10} title="Intellectual Property">
        <Para>
          The Winipat name, logo, design, software, and content are owned by Winipat and its licensors.
          You may not copy, modify, or create derivative works without permission. Sellers retain
          ownership of product photos and descriptions they upload but grant Winipat a non-exclusive
          licence to display them on the Platform.
        </Para>
      </Section>

      <Section number={11} title="Limitation of Liability">
        <Para>
          To the maximum extent permitted by law, Winipat is not liable for indirect, consequential, or
          punitive damages arising from your use of the Platform. Our total liability for any claim is
          limited to the amount of platform fees you have paid in the 6 months preceding the claim.
        </Para>
        <Para>
          Winipat does not warrant uninterrupted or error-free service. The Platform is provided
          &quot;as is&quot;.
        </Para>
      </Section>

      <Section number={12} title="Account Termination & Suspension">
        <Para>
          You may close your account at any time by contacting{" "}
          <a href="mailto:support@winipat.com" className="text-royal underline">support@winipat.com</a>.
        </Para>
        <Para>
          Winipat may <strong>suspend or terminate</strong> your account, without prior notice, for any of
          the following:
        </Para>
        <Bullets>
          <li>Material breach of these Terms (e.g. selling prohibited items, listing counterfeits)</li>
          <li>Suspected fraud, money laundering, or coordinated review manipulation</li>
          <li>Multiple substantiated buyer disputes (typically &gt;3 in a 30-day window for sellers)</li>
          <li>Failure to respond to KYC or escalation requests within 7 days</li>
          <li>Chargeback abuse — see Section 14 below</li>
          <li>Use of the Platform for activity outside Nigeria&apos;s legal framework</li>
        </Bullets>
        <Para>
          When we suspend an account, any funds in escrow that are <strong>not subject to active disputes</strong> are
          refunded to the original payer within 10 business days. Disputed funds remain frozen until
          resolution.
        </Para>
      </Section>

      <Section number={13} title="KYC Verification (Sellers)">
        <Para>
          All sellers must complete Know-Your-Customer verification before listing products. This is
          a compliance and fraud-prevention requirement and is non-negotiable.
        </Para>
        <Para>What we collect at KYC:</Para>
        <Bullets>
          <li>Government-issued ID (National ID, Driver&apos;s Licence, International Passport, or Voter&apos;s Card)</li>
          <li>Verified Nigerian phone number</li>
          <li>Bank account in the seller&apos;s legal name for payouts</li>
          <li>Pickup address (street, city, state)</li>
          <li>Business name (if applicable)</li>
          <li>Optionally: CAC certificate or recent utility bill (electricity, waste, water) showing your pickup address &mdash; speeds up approval</li>
        </Bullets>
        <Para>
          Review timeline is typically 1 business day. Rejected applications include reasons and may
          be re-submitted once (appeal). Verification status is visible to buyers as a{" "}
          <strong>&ldquo;Verified Seller&rdquo;</strong> badge.
        </Para>
        <Para>
          We store KYC documents encrypted at rest and access is restricted to authorised reviewers.
          See our{" "}
          <a href="/legal/privacy" className="text-royal underline">Privacy Policy</a> for retention details.
        </Para>
      </Section>

      <Section number={14} title="Chargebacks & Payment Disputes">
        <Para>
          Card chargebacks initiated through your bank or card issuer (rather than via Winipat&apos;s
          dispute system) are treated as follows:
        </Para>
        <Bullets>
          <li>If the chargeback is filed <strong>before</strong> delivery confirmation, escrow funds are frozen and held pending resolution.</li>
          <li>If the chargeback is filed <strong>after</strong> escrow has released to the seller, Winipat will recover the funds from the seller&apos;s upcoming payouts or wallet balance.</li>
          <li>Where buyer evidence supports the chargeback, the buyer keeps the refund. Where seller evidence is stronger, Winipat will contest the chargeback with Paystack on the seller&apos;s behalf.</li>
          <li>Repeated chargebacks (3 or more in 90 days) attributed to user fault will result in account suspension.</li>
          <li>Friendly fraud (filing chargebacks on items genuinely delivered) is reported to Paystack and the Nigerian Inter-Bank Settlement System.</li>
        </Bullets>
        <Para>
          Always use Winipat&apos;s dispute system <strong>first</strong> — it&apos;s faster (2–3 business days vs the 30–60 day chargeback window) and won&apos;t affect your card profile.
        </Para>
      </Section>

      <Section number={15} title="Payment Release Conditions">
        <Para>
          Escrowed funds are released to the seller only when <strong>all</strong> of the following are true:
        </Para>
        <Bullets>
          <li>The order is marked Delivered by the logistics partner.</li>
          <li>The buyer has either clicked Confirm Delivery OR the 48-hour auto-confirm window has elapsed.</li>
          <li>No active dispute is open on the order.</li>
          <li>No chargeback or refund request is active.</li>
          <li>The seller has a valid bank account on file.</li>
        </Bullets>
        <Para>
          Once these conditions are met, the seller&apos;s payout is created (net of the platform
          commission) and processed in the next daily payout batch. Standard payout settlement is
          1–2 business days depending on the receiving bank.
        </Para>
        <Para>
          If a seller has no valid bank account, their escrow row stays in <em>release_eligible</em> state
          and they receive an in-app notification to add a bank account. Funds are held — never lost.
        </Para>
      </Section>

      <Section number={16} title="Governing Law">
        <Para>
          These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes that
          cannot be resolved through our internal process will be subject to the exclusive jurisdiction
          of the courts of Lagos State.
        </Para>
      </Section>

      <Section number={17} title="Changes to these Terms">
        <Para>
          We may update these Terms from time to time. Material changes will be notified by email
          and/or via a notice on the Platform at least 14 days before they take effect. Continued use
          after the effective date constitutes acceptance.
        </Para>
      </Section>
    </LegalDocument>
  );
}
