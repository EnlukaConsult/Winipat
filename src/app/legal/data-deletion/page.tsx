import type { Metadata } from "next";
import { LegalDocument, Section, Para, Bullets } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Account & Data Deletion",
  description:
    "How to request deletion of your Winipat account and the personal data we hold about you.",
};

export default function DataDeletionPage() {
  return (
    <LegalDocument
      title="Account & Data Deletion"
      effectiveDate="26 May 2026"
      intro="You can request deletion of your Winipat account and the personal data associated with it at any time. This page explains how to make that request, what we delete, what we keep for legal or accounting reasons, and how long the whole process takes."
    >
      <Section number={1} title="How to request account deletion">
        <Para>You have three options:</Para>
        <Bullets>
          <li>
            <strong className="text-midnight">From your account (fastest):</strong>{" "}
            Sign in at <a href="https://www.winipat.com/login" className="text-royal underline">winipat.com/login</a>, then go to{" "}
            <strong>Profile → Account → Delete my account</strong>. You&apos;ll be asked to confirm with your password.
          </li>
          <li>
            <strong className="text-midnight">By email:</strong>{" "}
            Write to{" "}
            <a href="mailto:support@winipat.com?subject=Delete%20my%20Winipat%20account" className="text-royal underline">
              support@winipat.com
            </a>{" "}
            from the email address on file with the subject &quot;Delete my Winipat account&quot;. We&apos;ll respond within one business day with a confirmation link.
          </li>
          <li>
            <strong className="text-midnight">If you signed in with Facebook or Google:</strong>{" "}
            You can revoke our app&apos;s access from your{" "}
            <a href="https://www.facebook.com/settings?tab=applications" className="text-royal underline">Facebook App Settings</a>{" "}
            or{" "}
            <a href="https://myaccount.google.com/permissions" className="text-royal underline">Google Account permissions</a>,
            then email us as above to confirm full data deletion.
          </li>
        </Bullets>
      </Section>

      <Section number={2} title="What we delete">
        <Para>Within 30 days of receiving a confirmed deletion request, we permanently remove:</Para>
        <Bullets>
          <li>Your profile (name, email, phone, avatar, role)</li>
          <li>Your saved delivery addresses</li>
          <li>Your wishlist, cart, and saved searches</li>
          <li>Your reviews and ratings (these become anonymous on seller pages — the rating value is retained for trust-score integrity but no longer linked to you)</li>
          <li>Your messages with sellers</li>
          <li>Any KYC documents you uploaded (for sellers)</li>
          <li>Any uploaded product photos (for sellers) — unless an active order references them</li>
        </Bullets>
      </Section>

      <Section number={3} title="What we keep — and why">
        <Para>
          Some records must be retained to comply with Nigerian financial, tax,
          and consumer-protection law. Specifically:
        </Para>
        <Bullets>
          <li>
            <strong className="text-midnight">Order and payment records (7 years):</strong> Required by the Federal Inland Revenue Service (FIRS) for tax purposes and the Central Bank of Nigeria&apos;s anti-money-laundering rules. Your name on these records is redacted to your user ID after deletion.
          </li>
          <li>
            <strong className="text-midnight">Dispute resolution evidence (3 years):</strong> To allow re-opening disputes if needed and to defend Winipat against fraud claims.
          </li>
          <li>
            <strong className="text-midnight">Aggregate analytics:</strong> Non-personal usage statistics already stripped of any identifier.
          </li>
        </Bullets>
        <Para>
          These retained records are not used for marketing, profile rebuilding, or
          shared with third parties beyond the legal entities listed in our{" "}
          <a href="/legal/privacy" className="text-royal underline">Privacy Policy</a>.
        </Para>
      </Section>

      <Section number={4} title="Timeline">
        <Bullets>
          <li><strong className="text-midnight">Within 1 business day:</strong> We acknowledge your request and send a confirmation link</li>
          <li><strong className="text-midnight">Within 7 days:</strong> Account is deactivated and removed from public view (no longer searchable, sellers can no longer message you)</li>
          <li><strong className="text-midnight">Within 30 days:</strong> All deletable data is permanently removed from our active systems</li>
          <li><strong className="text-midnight">Within 90 days:</strong> Any remaining backups containing your data are rotated out</li>
        </Bullets>
      </Section>

      <Section number={5} title="If you have active orders">
        <Para>
          We can&apos;t fully delete your account while you have orders in escrow,
          pending delivery, or under dispute — both because we need to be able
          to refund you or pay the seller, and because removing your data would
          violate the other party&apos;s rights in the transaction.
        </Para>
        <Para>
          When you request deletion in this situation, we&apos;ll deactivate your
          account (you can&apos;t sign in or be contacted) and complete the
          deletion automatically once all open transactions are closed —
          typically within 60 days.
        </Para>
      </Section>

      <Section number={6} title="Confirmation">
        <Para>
          Once deletion is complete, we send a final email to your registered
          address confirming the date and time. Keep this for your records.
        </Para>
      </Section>

      <Section number={7} title="Questions or appeals">
        <Para>
          If you believe a deletion request has been ignored, mishandled, or
          unreasonably delayed, contact our Data Protection Officer at{" "}
          <a href="mailto:support@winipat.com" className="text-royal underline">support@winipat.com</a>{" "}
          with &quot;Data Protection&quot; in the subject line. You also have
          the right to lodge a complaint with the{" "}
          <a
            href="https://nitda.gov.ng"
            target="_blank"
            rel="noopener noreferrer"
            className="text-royal underline"
          >
            Nigeria Data Protection Commission (NDPC)
          </a>.
        </Para>
      </Section>
    </LegalDocument>
  );
}
