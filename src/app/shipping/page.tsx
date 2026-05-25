import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description:
    "How Winipat handles delivery in Nigeria — partner choice at checkout, tracking, dispatch times, and what happens when something goes wrong.",
};

export default function ShippingPage() {
  return (
    <MarketingPageShell
      title="Shipping & Delivery"
      intro="You pick the courier at checkout. We hold escrow until you confirm the package landed."
    >
      <h2>Logistics partners we ship with</h2>
      <p>
        At checkout we show you a list of active delivery partners with their flat
        fees so you can pick the trade-off you want (speed vs. price).
      </p>
      <ul>
        <li><strong>GIG Logistics</strong> — Next-day in Lagos, Abuja, Port Harcourt. 2–4 working days nationwide. Best for most orders.</li>
        <li><strong>Sendbox</strong> — Affordable inter-state. Tracking included. Slightly slower but lighter on the wallet.</li>
        <li><strong>Kwik Delivery</strong> — Same-day in Lagos via dispatch riders. Small items only.</li>
      </ul>
      <p>
        We&apos;re onboarding more partners (Bolt Cargo, GIG Logistics Premium, and
        a few regional couriers for the South-East). If you want a partner we don&apos;t
        list, email <a href="mailto:support@winipat.com">support@winipat.com</a> and
        we&apos;ll see if we can add them.
      </p>

      <h2>Dispatch times you should expect</h2>
      <ul>
        <li>Seller accepts the order — within 24 hours of payment (this is our SLA; if a seller stalls, we notify them and re-route or cancel).</li>
        <li>Seller marks the package ready — within 72 hours of accepting.</li>
        <li>Logistics partner picks up — usually within 24–48 hours of seller marking ready, depending on partner schedule.</li>
        <li>In-transit time — see partner-specific estimates above.</li>
      </ul>
      <p>
        Most Lagos-to-Lagos orders close in 2–3 working days. Lagos-to-Abuja averages
        4–5 working days. Anything taking longer than 7 working days from payment
        gets flagged automatically and our team checks in.
      </p>

      <h2>Tracking</h2>
      <p>
        Every order has a status page in your dashboard at{" "}
        <a href="/dashboard/orders">My Orders</a>. You&apos;ll see:
      </p>
      <ul>
        <li>Payment confirmed</li>
        <li>Seller accepted / preparing</li>
        <li>Package ready (with the seller&apos;s package photo)</li>
        <li>Picked up by courier (with pickup proof)</li>
        <li>In transit (live updates where the partner provides them)</li>
        <li>Delivered (with delivery proof)</li>
      </ul>
      <p>
        You also get an in-app notification (and an email if you&apos;ve verified your address)
        at each major step.
      </p>

      <h2>Delivery cost</h2>
      <p>
        Logistics fees are charged at checkout, in addition to the product price.
        They go directly to the logistics partner — Winipat doesn&apos;t take a cut
        on delivery. Typical fees range from ₦1,500 (Lagos same-day) to ₦2,500
        (nationwide next-day).
      </p>

      <h2>If something goes wrong in transit</h2>
      <p>
        If the package is marked delivered but you didn&apos;t receive it, or it arrives
        damaged, open a dispute from the order detail page within 48 hours of the
        delivery timestamp. Upload photos. Your escrow stays frozen until our team
        reviews.
      </p>
      <p>
        For partner-side failures (lost package, dropped at wrong address), we
        coordinate with the partner ourselves — you don&apos;t have to chase them.
      </p>

      <h2>Where we don&apos;t deliver yet</h2>
      <p>
        We currently ship to all 36 states + FCT. We don&apos;t do international
        shipping. Some rural LGAs may have longer transit times depending on the
        partner&apos;s coverage.
      </p>

      <p>
        Questions about a specific order: <a href="/contact">contact support</a>{" "}
        with your order number.
      </p>
    </MarketingPageShell>
  );
}
