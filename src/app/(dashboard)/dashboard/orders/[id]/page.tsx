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

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  product: {
    name: string;
    images: string[];
  };
};

type Order = {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  total_amount: number;
  delivery_address: string;
  delivery_mode: string;
  logistics_partner: string;
  tracking_number: string | null;
  notes: string | null;
  buyer: { full_name: string; email: string };
  seller: { full_name: string };
  items: OrderItem[];
  escrow: {
    status: string;
    amount: number;
  } | null;
};

const STATUS_STEPS: OrderStatus[] = [
  "pending_payment",
  "paid",
  "seller_preparing",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
];

const STEP_LABELS: Partial<Record<OrderStatus, string>> = {
  pending_payment: "Payment Pending",
  paid: "Payment Confirmed",
  seller_preparing: "Seller Preparing",
  awaiting_pickup: "Ready for Pickup",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  completed: "Completed",
};

const STEP_ICONS: Partial<Record<OrderStatus, React.ElementType>> = {
  pending_payment: Clock,
  paid: CreditCard,
  seller_preparing: Package,
  awaiting_pickup: Package,
  picked_up: Truck,
  in_transit: Truck,
  delivered: CheckCircle2,
  completed: ShieldCheck,
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

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, created_at, status, total_amount, delivery_address, delivery_mode, logistics_partner, tracking_number, notes,
       buyer:profiles!buyer_id(full_name, email),
       seller:profiles!seller_id(full_name),
       items:order_items(id, quantity, unit_price, product:products(name, images)),
       escrow:escrow_transactions(status, amount)`
    )
    .eq("id", id)
    .eq("buyer_id", user.id)
    .single();

  if (!order) return notFound();

  const o = order as unknown as Order;

  const currentStepIndex = STATUS_STEPS.indexOf(o.status);
  const isDisputable = ["delivered", "in_transit", "picked_up"].includes(o.status);
  const canConfirmDelivery = o.status === "delivered";
  const isTerminal = ["completed", "refunded", "cancelled", "dispute_opened"].includes(o.status);

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
              Placed {formatDate(o.created_at)} • Seller: {o.seller?.full_name}
            </p>
          </div>
          <StatusBadge status={o.status} />
        </div>
      </div>

      {/* Order timeline */}
      {!["dispute_opened", "refunded", "cancelled"].includes(o.status) && (
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
                  {/* Connector */}
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
                        className={`mt-1 w-0.5 flex-1 ${
                          isCompleted ? "bg-emerald" : "bg-mist-dark"
                        }`}
                        style={{ minHeight: "24px" }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pt-1 pb-2">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-royal"
                          : isCompleted
                          ? "text-emerald"
                          : "text-slate-lighter"
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
      {["dispute_opened", "cancelled", "refunded"].includes(o.status) && (
        <div className="flex items-start gap-3 rounded-[--radius-lg] border border-error/20 bg-error/5 p-4">
          <AlertTriangle size={20} className="flex-shrink-0 text-error mt-0.5" />
          <div>
            <p className="font-semibold text-error">
              {o.status === "dispute_opened"
                ? "Dispute Opened"
                : o.status === "refunded"
                ? "Order Refunded"
                : "Order Cancelled"}
            </p>
            <p className="mt-0.5 text-sm text-slate-light">
              {o.status === "dispute_opened"
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
            {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          {o.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[--radius-md] bg-gradient-to-br from-royal/10 to-violet/10 overflow-hidden">
                {item.product?.images?.[0] ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package size={20} className="text-royal/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-midnight truncate">{item.product?.name}</p>
                <p className="text-sm text-slate-light">
                  Qty: {item.quantity} × {formatNaira(item.unit_price)}
                </p>
              </div>
              <p className="font-semibold text-midnight flex-shrink-0">
                {formatNaira(item.quantity * item.unit_price)}
              </p>
            </div>
          ))}

          <div className="border-t border-mist pt-4">
            <div className="flex justify-between">
              <span className="font-semibold text-midnight">Order Total</span>
              <span className="text-xl font-bold text-royal">
                {formatNaira(o.total_amount)}
              </span>
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
              <Badge variant="success">{o.escrow.status}</Badge>
            ) : (
              <Badge variant="warning">Pending</Badge>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-light">Amount</span>
            <span className="font-medium text-midnight">
              {formatNaira(o.escrow?.amount ?? o.total_amount)}
            </span>
          </div>
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
              {o.logistics_partner || "—"}
            </span>
          </div>
          {o.tracking_number && (
            <div className="flex justify-between">
              <span className="text-slate-light">Tracking #</span>
              <span className="font-mono font-medium text-royal">
                {o.tracking_number}
              </span>
            </div>
          )}
          {o.delivery_address && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-light flex-shrink-0">Address</span>
              <span className="font-medium text-midnight text-right">
                {o.delivery_address}
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
                  const supabase = await createClient();
                  await supabase
                    .from("orders")
                    .update({ status: "completed" })
                    .eq("id", id);
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

          {/* Dispute form */}
          {isDisputable && (
            <div className="mt-4 rounded-[--radius-md] border border-warning/20 bg-warning/5 p-4">
              <p className="mb-3 text-sm font-semibold text-amber-700">
                Open a Dispute
              </p>
              <Textarea
                label="Describe the issue"
                placeholder="Please explain what went wrong with your order…"
                className="mb-3"
              />
              <Button variant="danger" size="sm">
                Submit Dispute
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
