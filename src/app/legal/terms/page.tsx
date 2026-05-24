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

      <Section number={12} title="Account Termination">
        <Para>
          You may close your account at any time by contacting{" "}
          <a href="mailto:support@winipat.com" className="text-royal underline">support@winipat.com</a>.
          Winipat may suspend or terminate your account for violation of these Terms, suspected fraud,
          or any reason that places other users at risk. We will refund any funds in escrow that are
          not subject to active disputes.
        </Para>
      </Section>

      <Section number={13} title="Governing Law">
        <Para>
          These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes that
          cannot be resolved through our internal process will be subject to the exclusive jurisdiction
          of the courts of Lagos State.
        </Para>
      </Section>

      <Section number={14} title="Changes to these Terms">
        <Para>
          We may update these Terms from time to time. Material changes will be notified by email
          and/or via a notice on the Platform at least 14 days before they take effect. Continued use
          after the effective date constitutes acceptance.
        </Para>
      </Section>
    </LegalDocument>
  );
}
