import type { Metadata } from "next";
import { TrackForm } from "./track-form";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Look up any Winipat order with the order number and email — no sign-in required.",
};

export default function TrackOrderPage() {
  return (
    <MarketingPageShell
      title="Track Your Order"
      intro="Enter your order number and the email you used at checkout. No sign-in needed."
    >
      <div className="not-prose">
        <TrackForm />
      </div>

      <h2>Where do I find my order number?</h2>
      <p>
        It&apos;s in the confirmation email we sent when you paid (subject line:
        <em> &quot;Order placed — WNP-…&quot;</em>). It starts with{" "}
        <code className="bg-mist px-1 rounded">WNP-</code> followed by letters and
        numbers.
      </p>
      <p>
        If you registered, you can also see all your orders in the{" "}
        <a href="/dashboard/orders">My Orders</a> dashboard.
      </p>

      <h2>What if my order&apos;s status hasn&apos;t changed in a while?</h2>
      <p>
        Most orders move through statuses within hours. If you see no change for
        more than 48 hours after the seller accepted, contact{" "}
        <a href="/contact">support</a> with your order number — there&apos;s usually
        a logistics hiccup we can chase down.
      </p>
    </MarketingPageShell>
  );
}
