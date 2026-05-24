import type { Metadata } from "next";
import { LegalDocument, Section, Para, Bullets } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Winipat collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveDate="24 May 2026"
      intro="This Privacy Policy explains how Winipat collects, uses, shares, and protects your personal information when you use winipat.com. We comply with the Nigeria Data Protection Regulation (NDPR) and the Nigeria Data Protection Act 2023."
    >
      <Section number={1} title="Who We Are">
        <Para>
          &quot;Winipat&quot; refers to the operator of the Winipat platform at winipat.com. For data
          protection enquiries, contact us at <a href="mailto:support@winipat.com" className="text-royal underline">support@winipat.com</a>.
        </Para>
      </Section>

      <Section number={2} title="Information We Collect">
        <Para><strong className="text-midnight">Account information:</strong></Para>
        <Bullets>
          <li>Full name, email address, phone number</li>
          <li>Date of birth (where required for age verification)</li>
          <li>Profile photo (optional)</li>
          <li>Role (buyer, seller, logistics partner)</li>
        </Bullets>

        <Para><strong className="text-midnight">Seller KYC information:</strong></Para>
        <Bullets>
          <li>Business name and description</li>
          <li>Pickup address (street, city, state)</li>
          <li>Government-issued ID document</li>
          <li>Bank account details (account number, bank name, account holder)</li>
          <li>Optional bank statement for verification</li>
        </Bullets>

        <Para><strong className="text-midnight">Transactional data:</strong></Para>
        <Bullets>
          <li>Orders, payments, payouts, refunds, and dispute history</li>
          <li>Product listings, reviews, ratings, and messages</li>
          <li>Delivery addresses and tracking information</li>
        </Bullets>

        <Para><strong className="text-midnight">Technical data (automatic):</strong></Para>
        <Bullets>
          <li>Device type, browser, operating system, screen size</li>
          <li>IP address and approximate location (city-level)</li>
          <li>Pages visited, time spent, click paths</li>
          <li>Cookies (see Section 5)</li>
        </Bullets>
      </Section>

      <Section number={3} title="How We Use Your Information">
        <Bullets>
          <li>To provide the Platform and process your orders, payments, and disputes</li>
          <li>To verify identity and prevent fraud (KYC, anti-money laundering)</li>
          <li>To communicate with you about orders, account changes, and security alerts</li>
          <li>To improve the Platform — analytics, debugging, feature development</li>
          <li>To comply with legal obligations (tax, regulator requests, court orders)</li>
          <li>To send marketing communications (only with your consent; you can opt out any time)</li>
        </Bullets>
      </Section>

      <Section number={4} title="Sharing Your Information">
        <Para>We share your data only with parties that need it to deliver the service:</Para>
        <Bullets>
          <li><strong className="text-midnight">Sellers and buyers</strong> — limited info needed to complete an order (your name, delivery address, contact for the logistics partner)</li>
          <li><strong className="text-midnight">Payment provider (Paystack)</strong> — to process card payments and bank transfers</li>
          <li><strong className="text-midnight">Logistics partners</strong> — pickup/delivery details for the orders they handle</li>
          <li><strong className="text-midnight">Service providers</strong> — Supabase (database hosting), Vercel (web hosting), email delivery services</li>
          <li><strong className="text-midnight">Regulators &amp; law enforcement</strong> — when required by Nigerian law</li>
        </Bullets>
        <Para>
          We <strong className="text-midnight">never sell</strong> your personal data to third parties for marketing.
        </Para>
      </Section>

      <Section number={5} title="Cookies & Tracking">
        <Para>
          We use the following categories of cookies:
        </Para>
        <Bullets>
          <li><strong className="text-midnight">Essential cookies</strong> — keep you signed in, remember your cart. These cannot be disabled.</li>
          <li><strong className="text-midnight">Functional cookies</strong> — remember your preferences (currency display, language).</li>
          <li><strong className="text-midnight">Analytics cookies</strong> — help us understand how the Platform is used. You can opt out via the cookie banner.</li>
        </Bullets>
      </Section>

      <Section number={6} title="Data Retention">
        <Bullets>
          <li>Active account data: retained while your account is active</li>
          <li>Transactional records: retained for 7 years after the last transaction (tax + audit requirements)</li>
          <li>KYC documents: retained for 5 years after account closure (anti-money laundering)</li>
          <li>Marketing preferences: retained until you opt out</li>
          <li>Closed account: most data deleted within 90 days of closure request; transactional + KYC retained per above</li>
        </Bullets>
      </Section>

      <Section number={7} title="Your Rights">
        <Para>Under NDPR and applicable Nigerian law, you have the right to:</Para>
        <Bullets>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>Request deletion of your data (subject to retention obligations above)</li>
          <li>Withdraw consent for processing where consent was the legal basis</li>
          <li>Object to direct marketing</li>
          <li>Receive a copy of your data in a portable format</li>
          <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC)</li>
        </Bullets>
        <Para>
          To exercise any of these rights, email{" "}
          <a href="mailto:support@winipat.com" className="text-royal underline">support@winipat.com</a>.
          We will respond within 30 days.
        </Para>
      </Section>

      <Section number={8} title="Security">
        <Para>
          We protect your data using TLS encryption in transit, encryption at rest, role-based access
          control, and audit logging. Payment card data is never stored on Winipat systems — it is
          handled directly by our PCI-DSS-compliant payment provider.
        </Para>
        <Para>
          No system is perfectly secure. If we become aware of a data breach affecting your personal
          information, we will notify you and the NDPC within 72 hours.
        </Para>
      </Section>

      <Section number={9} title="Children">
        <Para>
          Winipat is not intended for users under 18. We do not knowingly collect data from minors.
          If you believe a minor has provided us data, contact us and we will delete it.
        </Para>
      </Section>

      <Section number={10} title="International Transfers">
        <Para>
          Our infrastructure may store data on servers outside Nigeria (e.g. Supabase&apos;s EU
          region). We ensure equivalent protection via contractual safeguards and only transfer data
          to jurisdictions that meet NDPR adequacy standards.
        </Para>
      </Section>

      <Section number={11} title="Updates to this Policy">
        <Para>
          We may update this Policy. Material changes will be notified by email and via an in-app
          banner at least 14 days before they take effect.
        </Para>
      </Section>
    </LegalDocument>
  );
}
