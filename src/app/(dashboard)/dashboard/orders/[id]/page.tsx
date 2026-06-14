import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNaira, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/utils";
import {
  Package,
  MapPin,
  CreditCard,
  ArrowLeft,
  Truck,
  Lock,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { OrderDetailActions } from "./order-detail-actions";
import { OrderProgress } from "@/components/buyer/order-progress";
import { OrderStateBanner } from "@/components/buyer/order-state-banner";
import { ContactSellerButton } from "@/components/buyer/contact-seller-button";

// Snapshot of an item at order time (price/name frozen so product changes don't
// affect historical orders). product_id is kept for an optional best-effort
// image lookup.
type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;   // kobo
  quantity: number;
};

type Address = {
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
};

type Order = {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  subtotal: number;          // kobo
  logistics_fee: number;     // kobo
  platform_fee: number;      // kobo
  total: number;             // kobo
  delivery_mode: string;
  buyer:    { full_name: string | null; email: string | null } | null;
  // seller.id needed for the Message-seller CTA; business_name for display.
  seller:   { id: string; business_name: string | null } | null;
  delivery_address: Address | null;
  logistics: { name: string; logo_url: string | null } | null;
  shipment:  { tracking_number: string | null; status: string;
              picked_up_at: string | null; delivered_at: string | null } | null;
  escrow:    { status: string; amount: number; released_at: string | null } | null;
  items: OrderItem[];
};

// Timeline labels + icons moved to the OrderProgress component (5-step
// horizontal strip with stage hints) — this page used to render its own
// vertical 8-step list which crowded the layout on mobile.

const EXCEPTION_STATES = new Set<OrderStatus>([
  "disputed",
  "cancelled",
  "refunded",
]);

function formatAddress(a: Address | null): string {
  if (!a) return "—";
  return [a.street, a.city, a.state, a.country].filter(Boolean).join(", ");
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// Status-aware hero headline. More personal than just "Order
// #WNP-XYZ" — tells the buyer at a glance what state they're in.
const STATUS_HEADLINE: Partial<Record<OrderStatus, string>> = {
  pending_payment:   "Finish your payment",
  payment_confirmed: "Payment received — seller notified",
  seller_preparing:  "Seller is preparing your order",
  awaiting_pickup:   "Packed and ready for courier",
  picked_up:         "Courier has your package",
  in_transit:        "On the way to you",
  delivered:         "Delivered — please confirm",
  completed:         "Order complete",
  disputed:          "Dispute open",
  cancelled:         "Order cancelled",
  refunded:          "Refund processed",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  // Pull the order with all the joins it needs. Each relation goes through
  // a proper foreign key, never a non-existent column:
  //   orders.buyer_id            -> profiles(id)
  //   orders.seller_id           -> sellers(id)
  //   orders.delivery_address_id -> addresses(id)
  //   orders.logistics_partner_id-> logistics_partners(id)
  //   shipments.order_id         -> orders(id)        (reverse one-to-one in practice)
  //   escrow_ledger.order_id     -> orders(id)        (UNIQUE one-to-one)
  //   order_items.order_id       -> orders(id)        (one-to-many)
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, created_at, status,
      subtotal, logistics_fee, platform_fee, total, delivery_mode,
      buyer:profiles!buyer_id ( full_name, email ),
      seller:sellers!seller_id ( id, business_name ),
      delivery_address:addresses!delivery_address_id ( label, street, city, state, country ),
      logistics:logistics_partners!logistics_partner_id ( name, logo_url ),
      shipment:shipments ( tracking_number, status, picked_up_at, delivered_at ),
      escrow:escrow_ledger ( status, amount, released_at ),
      items:order_items ( id, product_id, product_name, product_price, quantity )
    `)
    .eq("id", id)
    .eq("buyer_id", user.id)
    .single();

  if (error || !order) return notFound();

  // Supabase returns joined `shipments` / `escrow_ledger` as arrays even when the
  // relationship is one-to-one in practice — normalise to a single record.
  const raw = order as Record<string, unknown>;
  const o: Order = {
    ...(raw as unknown as Order),
    shipment: Array.isArray(raw.shipment) ? (raw.shipment[0] ?? null) : (raw.shipment as Order["shipment"]),
    escrow:   Array.isArray(raw.escrow)   ? (raw.escrow[0]   ?? null) : (raw.escrow   as Order["escrow"]),
    items:    Array.isArray(raw.items)    ? (raw.items as OrderItem[]) : [],
  };

  // Best-effort product images — separate query keyed by the live product_ids
  // we just got. If a product was deleted, we just skip its image.
  const productIds = o.items.map((i) => i.product_id).filter((x): x is string => !!x);
  const imagesByProduct = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("product_media")
      .select("product_id, file_url, display_order")
      .in("product_id", productIds)
      .eq("media_type", "image")
      .order("display_order", { ascending: true });
    for (const row of mediaRows ?? []) {
      const pid = row.product_id as string;
      if (!imagesByProduct.has(pid)) imagesByProduct.set(pid, row.file_url as string);
    }
  }

  const isDisputable = ["delivered", "in_transit", "picked_up"].includes(o.status);
  const canConfirmDelivery = o.status === "delivered";
  const isTerminal = ["completed", "refunded", "cancelled", "disputed"].includes(o.status);
  const isException = EXCEPTION_STATES.has(o.status);
  const totalItems = o.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back link — stays compact above the hero */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm text-slate-light hover:text-violet transition-colors"
      >
        <ArrowLeft size={16} />
        Back to orders
      </Link>

      {/* Hero — gradient, status badge, key stats, Message-seller CTA.
          Matches the visual weight of the buyer dashboard hero. */}
      <section
        className="relative overflow-hidden rounded-2xl text-white px-6 py-6 sm:px-8 sm:py-7"
        style={{
          background: `
            radial-gradient(circle at 88% 12%, rgba(20,184,166,0.32), transparent 36%),
            radial-gradient(circle at 8% 88%, rgba(124,58,237,0.38), transparent 36%),
            linear-gradient(125deg, #0B1020 0%, #15205A 55%, #4B23C0 100%)
          `,
        }}
      >
        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-5 items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider mb-3">
              <ShoppingBag className="h-3 w-3 text-teal-light" aria-hidden="true" />
              Order #{o.order_number}
            </div>

            <h1 className="font-[family-name:var(--font-sora)] text-2xl sm:text-3xl font-bold leading-tight">
              {isException
                ? STATUS_HEADLINE[o.status as "disputed" | "cancelled" | "refunded"]
                : STATUS_HEADLINE[o.status] ?? "Your order"}
            </h1>
            {o.seller?.business_name && (
              <p className="mt-1.5 text-sm sm:text-base text-white/75">
                Sold by{" "}
                <strong className="font-semibold">{o.seller.business_name}</strong>
              </p>
            )}

            {/* Compact 3-up stats — total / items / days */}
            <ul className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm" role="list">
              <li>
                <span className="text-white/55 text-[11px] uppercase tracking-wider font-bold block">
                  Total
                </span>
                <span className="font-[family-name:var(--font-sora)] text-lg font-bold">
                  {formatNaira(o.total / 100)}
                </span>
              </li>
              <li>
                <span className="text-white/55 text-[11px] uppercase tracking-wider font-bold block">
                  Items
                </span>
                <span className="font-[family-name:var(--font-sora)] text-lg font-bold">
                  {totalItems}
                </span>
              </li>
              <li>
                <span className="text-white/55 text-[11px] uppercase tracking-wider font-bold block">
                  Placed
                </span>
                <span className="font-[family-name:var(--font-sora)] text-lg font-bold inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-white/70" aria-hidden="true" />
                  {daysSince(o.created_at) === 0
                    ? "Today"
                    : `${daysSince(o.created_at)}d ago`}
                </span>
              </li>
            </ul>
          </div>

          {/* Message-seller CTA — only when there's a seller to message. */}
          {o.seller?.id && (
            <ContactSellerButton sellerId={o.seller.id} orderId={o.id} />
          )}
        </div>
      </section>

      {/* Order progress (5-step) — hidden for disputed/cancelled/refunded,
          which get the OrderStateBanner instead. */}
      {!isException && <OrderProgress status={o.status} />}

      {/* Disputed / cancelled / refunded banner */}
      {isException && (
        <OrderStateBanner
          status={o.status as "disputed" | "cancelled" | "refunded"}
          orderId={o.id}
        />
      )}

      {/* Order items — bigger thumbs, name links back to product page
          when the product still exists (FK is SET NULL on deletion). */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Order items</CardTitle>
          <CardDescription>
            {o.items.length} item{o.items.length !== 1 ? "s" : ""}
            {totalItems !== o.items.length && (
              <> &middot; {totalItems} unit{totalItems !== 1 ? "s" : ""}</>
            )}
          </CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {o.items.map((item) => {
            const imgUrl = item.product_id ? imagesByProduct.get(item.product_id) : undefined;
            const productHref = item.product_id ? `/dashboard/product/${item.product_id}` : null;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 sm:gap-4 p-2 -mx-2 rounded-xl hover:bg-cloud transition-colors"
              >
                {productHref ? (
                  <Link
                    href={productHref}
                    className="flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet/10 to-teal/10 overflow-hidden group"
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={item.product_name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Package size={22} className="text-violet/40" />
                    )}
                  </Link>
                ) : (
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center rounded-xl bg-mist">
                    <Package size={22} className="text-slate-lighter" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {productHref ? (
                    <Link
                      href={productHref}
                      className="font-semibold text-midnight hover:text-violet transition-colors line-clamp-2"
                    >
                      {item.product_name}
                    </Link>
                  ) : (
                    <p className="font-semibold text-slate-light line-clamp-2">
                      {item.product_name}{" "}
                      <span className="text-[10px] font-normal uppercase tracking-wider ml-1 text-slate-lighter">
                        no longer listed
                      </span>
                    </p>
                  )}
                  <p className="mt-0.5 text-sm text-slate-light">
                    Qty {item.quantity} &middot; {formatNaira(item.product_price / 100)} each
                  </p>
                </div>
                <p className="font-bold text-midnight flex-shrink-0">
                  {formatNaira((item.quantity * item.product_price) / 100)}
                </p>
              </div>
            );
          })}

          {/* Cost breakdown */}
          <div className="border-t border-mist pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-light">Subtotal</span>
              <span className="text-midnight">{formatNaira(o.subtotal / 100)}</span>
            </div>
            {o.logistics_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-light">Logistics fee</span>
                <span className="text-midnight">{formatNaira(o.logistics_fee / 100)}</span>
              </div>
            )}
            {o.platform_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-light">Service fee</span>
                <span className="text-midnight">{formatNaira(o.platform_fee / 100)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-mist">
              <span className="font-semibold text-midnight">Order Total</span>
              <span className="text-xl font-bold text-royal">{formatNaira(o.total / 100)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment info — adds the protection callout buyers care about
          (escrow status + what it means in plain English). */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} className="text-violet" />
            Payment &amp; escrow
          </CardTitle>
        </CardHeader>

        {/* Top escrow callout — coloured by current escrow state */}
        <div
          className={`mb-4 rounded-xl border p-3.5 flex items-start gap-3 ${
            o.escrow?.status === "released"
              ? "border-emerald/30 bg-emerald/8"
              : "border-violet/30 bg-violet/8"
          }`}
        >
          <span
            className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg ${
              o.escrow?.status === "released"
                ? "bg-emerald/15 text-emerald-dark"
                : "bg-violet/15 text-violet"
            }`}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-midnight">
              {o.escrow?.status === "released"
                ? "Funds released to seller"
                : "Payment held in escrow"}
            </p>
            <p className="text-xs text-slate-light mt-0.5 leading-relaxed">
              {o.escrow?.status === "released"
                ? "Your protection window has closed. If you have any concerns, contact support."
                : "Your payment stays safe with Winipat until you confirm delivery (or 48 hours after). If anything goes wrong, you can open a dispute."}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-light">Status</span>
            {o.escrow ? (
              <Badge variant={o.escrow.status === "released" ? "success" : "warning"}>
                {o.escrow.status.replace(/_/g, " ")}
              </Badge>
            ) : (
              <Badge variant="warning">Pending</Badge>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-light">Amount held</span>
            <span className="font-medium text-midnight">
              {formatNaira((o.escrow?.amount ?? o.total) / 100)}
            </span>
          </div>
          {o.escrow?.released_at && (
            <div className="flex justify-between">
              <span className="text-slate-light">Released on</span>
              <span className="font-medium text-midnight">{formatDate(o.escrow.released_at)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Delivery info — tracking number gets a hero callout (most-asked
          question), then the structured fact-list, then the address as
          its own card-within-a-card so it reads at a glance on mobile. */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck size={18} className="text-royal" />
            Delivery
          </CardTitle>
        </CardHeader>

        {/* Tracking callout — the single most useful piece of delivery
            info once the courier has the package. */}
        {o.shipment?.tracking_number && (
          <div className="mb-4 rounded-xl border border-royal/25 bg-royal/8 p-3.5 flex items-start gap-3">
            <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-royal/15 text-royal">
              <Truck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider font-bold text-royal">
                Tracking number
              </p>
              <p className="mt-0.5 font-mono text-base font-bold text-midnight break-all">
                {o.shipment.tracking_number}
              </p>
              {o.logistics?.name && (
                <p className="mt-1 text-xs text-slate-light">
                  Use this on {o.logistics.name}&apos;s tracking page.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-light">Mode</span>
            <span className="font-medium text-midnight capitalize">
              {o.delivery_mode?.replace(/_/g, " ") || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-light">Logistics partner</span>
            <span className="font-medium text-midnight">
              {o.logistics?.name || "—"}
            </span>
          </div>
          {o.shipment?.picked_up_at && (
            <div className="flex justify-between">
              <span className="text-slate-light">Picked up</span>
              <span className="font-medium text-midnight">{formatDate(o.shipment.picked_up_at)}</span>
            </div>
          )}
          {o.shipment?.delivered_at && (
            <div className="flex justify-between">
              <span className="text-slate-light">Delivered</span>
              <span className="font-medium text-midnight">{formatDate(o.shipment.delivered_at)}</span>
            </div>
          )}
        </div>

        {/* Address — own block so it gets room to breathe on mobile. */}
        {o.delivery_address && (
          <div className="mt-4 rounded-xl border border-mist bg-cloud/40 p-3.5 flex items-start gap-3">
            <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-violet/10 text-violet">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-light">
                {o.delivery_address.label || "Delivery address"}
              </p>
              <p className="mt-0.5 text-sm font-medium text-midnight leading-relaxed">
                {formatAddress(o.delivery_address)}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Action buttons (interactive — extracted to a client component so
          we can call the proper API routes with feedback / error handling) */}
      {!isTerminal && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <OrderDetailActions
            orderId={o.id}
            canConfirmDelivery={canConfirmDelivery}
            canOpenDispute={isDisputable}
            canLeaveReview={o.status === "completed"}
          />
        </Card>
      )}
    </div>
  );
}
