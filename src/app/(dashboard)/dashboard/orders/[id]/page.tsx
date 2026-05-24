import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/utils";
import {
  Package,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Star,
  ArrowLeft,
  Clock,
  Truck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

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
  seller:   { business_name: string | null } | null;
  delivery_address: Address | null;
  logistics: { name: string; logo_url: string | null } | null;
  shipment:  { tracking_number: string | null; status: string;
              picked_up_at: string | null; delivered_at: string | null } | null;
  escrow:    { status: string; amount: number; released_at: string | null } | null;
  items: OrderItem[];
};

const STATUS_STEPS: OrderStatus[] = [
  "pending_payment",
  "payment_confirmed",
  "seller_preparing",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
];

const STEP_LABELS: Partial<Record<OrderStatus, string>> = {
  pending_payment:   "Payment Pending",
  payment_confirmed: "Payment Confirmed",
  seller_preparing:  "Seller Preparing",
  awaiting_pickup:   "Ready for Pickup",
  picked_up:         "Picked Up",
  in_transit:        "In Transit",
  delivered:         "Delivered",
  completed:         "Completed",
};

const STEP_ICONS: Partial<Record<OrderStatus, React.ElementType>> = {
  pending_payment:   Clock,
  payment_confirmed: CreditCard,
  seller_preparing:  Package,
  awaiting_pickup:   Package,
  picked_up:         Truck,
  in_transit:        Truck,
  delivered:         CheckCircle2,
  completed:         ShieldCheck,
};

function formatAddress(a: Address | null): string {
  if (!a) return "—";
  return [a.street, a.city, a.state, a.country].filter(Boolean).join(", ");
}

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
      seller:sellers!seller_id ( business_name ),
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

  const currentStepIndex = STATUS_STEPS.indexOf(o.status);
  const isDisputable = ["delivered", "in_transit", "picked_up"].includes(o.status);
  const canConfirmDelivery = o.status === "delivered";
  const isTerminal = ["completed", "refunded", "cancelled", "disputed"].includes(o.status);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-sm text-slate-light hover:text-royal transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
              Order #{o.order_number}
            </h1>
            <p className="mt-0.5 text-sm text-slate-light">
              Placed {formatDate(o.created_at)}
              {o.seller?.business_name && <> • Seller: {o.seller.business_name}</>}
            </p>
          </div>
          <StatusBadge status={o.status} />
        </div>
      </div>

      {/* Order timeline */}
      {!["disputed", "refunded", "cancelled"].includes(o.status) && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <ol className="relative space-y-0">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = STEP_ICONS[step] || Clock;

              return (
                <li key={step} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 z-10 ${
                        isCompleted
                          ? "border-emerald bg-emerald text-white"
                          : isCurrent
                          ? "border-royal bg-royal text-white shadow-lg shadow-royal/30"
                          : "border-mist-dark bg-white text-slate-lighter"
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div
                        className={`mt-1 w-0.5 flex-1 ${isCompleted ? "bg-emerald" : "bg-mist-dark"}`}
                        style={{ minHeight: "24px" }}
                      />
                    )}
                  </div>

                  <div className="pt-1 pb-2">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent ? "text-royal" : isCompleted ? "text-emerald" : "text-slate-lighter"
                      }`}
                    >
                      {STEP_LABELS[step] ?? step}
                    </p>
                    {isCurrent && (
                      <p className="mt-0.5 text-xs text-slate-light">Current status</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {/* Disputed / cancelled banner */}
      {["disputed", "cancelled", "refunded"].includes(o.status) && (
        <div className="flex items-start gap-3 rounded-[--radius-lg] border border-error/20 bg-error/5 p-4">
          <AlertTriangle size={20} className="flex-shrink-0 text-error mt-0.5" />
          <div>
            <p className="font-semibold text-error">
              {o.status === "disputed"
                ? "Dispute Opened"
                : o.status === "refunded"
                ? "Order Refunded"
                : "Order Cancelled"}
            </p>
            <p className="mt-0.5 text-sm text-slate-light">
              {o.status === "disputed"
                ? "This order is currently under review. Our team will contact you."
                : "This order has been resolved."}
            </p>
          </div>
        </div>
      )}

      {/* Order items */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            {o.items.length} item{o.items.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          {o.items.map((item) => {
            const imgUrl = item.product_id ? imagesByProduct.get(item.product_id) : undefined;
            return (
              <div key={item.id} className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[--radius-md] bg-gradient-to-br from-royal/10 to-violet/10 overflow-hidden">
                  {imgUrl ? (
                    <img src={imgUrl} alt={item.product_name} className="h-full w-full object-cover" />
                  ) : (
                    <Package size={20} className="text-royal/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-midnight truncate">{item.product_name}</p>
                  <p className="text-sm text-slate-light">
                    Qty: {item.quantity} × {formatNaira(item.product_price)}
                  </p>
                </div>
                <p className="font-semibold text-midnight flex-shrink-0">
                  {formatNaira(item.quantity * item.product_price)}
                </p>
              </div>
            );
          })}

          {/* Cost breakdown */}
          <div className="border-t border-mist pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-light">Subtotal</span>
              <span className="text-midnight">{formatNaira(o.subtotal)}</span>
            </div>
            {o.logistics_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-light">Logistics fee</span>
                <span className="text-midnight">{formatNaira(o.logistics_fee)}</span>
              </div>
            )}
            {o.platform_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-light">Service fee</span>
                <span className="text-midnight">{formatNaira(o.platform_fee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-mist">
              <span className="font-semibold text-midnight">Order Total</span>
              <span className="text-xl font-bold text-royal">{formatNaira(o.total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment info */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} className="text-royal" />
            Payment Info
          </CardTitle>
        </CardHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-light">Escrow Status</span>
            {o.escrow ? (
              <Badge variant={o.escrow.status === "released" ? "success" : "warning"}>
                {o.escrow.status.replace(/_/g, " ")}
              </Badge>
            ) : (
              <Badge variant="warning">Pending</Badge>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-light">Amount in escrow</span>
            <span className="font-medium text-midnight">
              {formatNaira(o.escrow?.amount ?? o.total)}
            </span>
          </div>
          {o.escrow?.released_at && (
            <div className="flex justify-between">
              <span className="text-slate-light">Released</span>
              <span className="font-medium text-midnight">{formatDate(o.escrow.released_at)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Delivery info */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin size={18} className="text-royal" />
            Delivery Info
          </CardTitle>
        </CardHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-light">Mode</span>
            <span className="font-medium text-midnight capitalize">
              {o.delivery_mode?.replace(/_/g, " ") || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-light">Logistics Partner</span>
            <span className="font-medium text-midnight">
              {o.logistics?.name || "—"}
            </span>
          </div>
          {o.shipment?.tracking_number && (
            <div className="flex justify-between">
              <span className="text-slate-light">Tracking #</span>
              <span className="font-mono font-medium text-royal">
                {o.shipment.tracking_number}
              </span>
            </div>
          )}
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
          {o.delivery_address && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-light flex-shrink-0">Address</span>
              <span className="font-medium text-midnight text-right">
                {formatAddress(o.delivery_address)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Action buttons */}
      {!isTerminal && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            {canConfirmDelivery && (
              <form
                action={async () => {
                  "use server";
                  // TODO Phase 3 Step 3: replace with POST to /api/orders/[id]/confirm-delivery
                  // so escrow release + commission split run in the proper place.
                  const supabase = await createClient();
                  await supabase.from("orders").update({ status: "completed" }).eq("id", id);
                }}
              >
                <Button variant="primary" size="md" type="submit">
                  <CheckCircle2 size={16} className="mr-2" />
                  Confirm Delivery
                </Button>
              </form>
            )}

            {isDisputable && (
              <Button variant="outline" size="md">
                <AlertTriangle size={16} className="mr-2" />
                Open Dispute
              </Button>
            )}

            {o.status === "completed" && (
              <Button variant="gold" size="md">
                <Star size={16} className="mr-2" />
                Leave Review
              </Button>
            )}
          </div>

          {isDisputable && (
            <div className="mt-4 rounded-[--radius-md] border border-warning/20 bg-warning/5 p-4">
              <p className="mb-3 text-sm font-semibold text-amber-700">Open a Dispute</p>
              <Textarea
                label="Describe the issue"
                placeholder="Please explain what went wrong with your order…"
                className="mb-3"
              />
              <Button variant="danger" size="sm">Submit Dispute</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
