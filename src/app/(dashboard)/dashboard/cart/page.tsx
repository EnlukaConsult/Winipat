"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Lock,
  ShieldCheck,
  Truck,
  Building2,
  Package,
} from "lucide-react";

type CartItem = {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock_quantity: number;
    product_media: { file_url: string }[] | null;
    sellers: { business_name: string } | null;
    categories: { name: string } | null;
  } | null;
};

const LOGISTICS_OPTIONS = [
  { id: "gig", name: "GIG Logistics", fee: 250000, eta: "2-4 days", type: "door_to_door" },
  { id: "dhl", name: "DHL Express", fee: 450000, eta: "1-2 days", type: "door_to_door" },
  { id: "pickup", name: "Pickup Office (GIG)", fee: 150000, eta: "2-4 days", type: "pickup_office" },
];

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryMode, setDeliveryMode] = useState<"door_to_door" | "pickup_office">("door_to_door");
  const [selectedLogistics, setSelectedLogistics] = useState(LOGISTICS_OPTIONS[0]);
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadCart() {
    const res = await fetch("/api/cart");
    const data = await res.json();
    // Normalize joined arrays
    const normalized = (data.items || []).map((item: Record<string, unknown>) => ({
      ...item,
      products: Array.isArray(item.products) ? item.products[0] : item.products,
    }));
    setItems(normalized as CartItem[]);
    setLoading(false);
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQuantity(itemId: string, newQty: number) {
    setUpdating(itemId);
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity: newQty }),
    });
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
    );
    setUpdating(null);
  }

  async function removeItem(itemId: string) {
    setUpdating(itemId);
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setUpdating(null);
  }

  const subtotal = items.reduce(
    (sum, item) => sum + ((item.products?.price || 0) / 100) * item.quantity,
    0
  );
  const logisticsFee = selectedLogistics.fee / 100;
  const total = subtotal + logisticsFee;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-mist rounded-[--radius-lg]" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12 sm:py-16">
        <div className="rounded-2xl border border-violet/20 bg-gradient-to-br from-violet/[0.04] via-white to-teal/[0.04] p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet/15 to-teal/15 flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="h-7 w-7 text-violet" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-midnight font-[family-name:var(--font-sora)]">
            Your cart is empty
          </h2>
          <p className="text-sm text-slate-light mt-2 max-w-sm mx-auto">
            Browse verified sellers, add items, and your payment stays in
            escrow until you confirm delivery.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button variant="primary" onClick={() => router.push("/dashboard/browse")}>
              Browse products
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </div>

        {/* Mini trust strip below the empty card */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-light">
          <span className="inline-flex items-center gap-1">
            <Lock size={11} className="text-violet" aria-hidden="true" />
            Escrow protected
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={11} className="text-emerald" aria-hidden="true" />
            KYC-verified sellers
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* ===== Top trust callout — first thing buyers see before checkout ===== */}
      <div className="rounded-2xl bg-gradient-to-r from-violet/8 via-teal/5 to-emerald/8 border border-violet/15 px-4 py-3 mb-5 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm shrink-0">
          <Lock className="h-4 w-4 text-violet" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-midnight leading-tight">
            Payment held in escrow until you confirm delivery
          </p>
          <p className="text-xs text-slate-light mt-0.5 leading-snug">
            48-hour buyer-protection window after delivery · Free to abandon cart at any point
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== CART ITEMS ===== */}
        <div className="lg:col-span-2 space-y-4">
          <p className="text-sm text-slate-light">{items.length} item{items.length > 1 ? "s" : ""} in cart</p>

          {items.map((item) => {
            const product = item.products;
            if (!product) return null;
            const imageUrl = Array.isArray(product.product_media)
              ? product.product_media[0]?.file_url
              : null;
            const seller = Array.isArray(product.sellers)
              ? (product.sellers as unknown as { business_name: string }[])[0]
              : product.sellers;
            const category = Array.isArray(product.categories)
              ? (product.categories as unknown as { name: string }[])[0]
              : product.categories;

            return (
              <Card key={item.id} padding="sm" className="relative">
                <div className="flex gap-4">
                  {/* Image */}
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-[--radius-md] overflow-hidden bg-cloud shrink-0 cursor-pointer"
                    onClick={() => router.push(`/dashboard/product/${product.id}`)}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-mist-dark" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold text-midnight line-clamp-2 cursor-pointer hover:text-violet transition-colors"
                      onClick={() => router.push(`/dashboard/product/${product.id}`)}
                    >
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {seller?.business_name && (
                        <span className="text-xs text-slate-light">{seller.business_name}</span>
                      )}
                      {category?.name && (
                        <span className="text-xs text-violet bg-violet/10 px-2 py-0.5 rounded-full">
                          {category.name}
                        </span>
                      )}
                    </div>

                    <p className="text-lg font-bold text-violet mt-2 font-[family-name:var(--font-sora)]">
                      {formatNaira(product.price / 100)}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-mist rounded-[--radius-md]">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1 || updating === item.id}
                          className="px-2.5 py-1.5 text-slate hover:bg-cloud transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 py-1.5 text-sm font-semibold text-midnight border-x border-mist min-w-[36px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, Math.min(product.stock_quantity, item.quantity + 1))}
                          disabled={item.quantity >= product.stock_quantity || updating === item.id}
                          className="px-2.5 py-1.5 text-slate hover:bg-cloud transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                        className="text-slate-lighter hover:text-error transition-colors cursor-pointer p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ===== ORDER SUMMARY SIDEBAR ===== */}
        <div className="space-y-4">
          {/* Delivery mode */}
          <Card padding="sm">
            <p className="text-sm font-semibold text-midnight mb-3">Delivery Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setDeliveryMode("door_to_door");
                  setSelectedLogistics(LOGISTICS_OPTIONS[0]);
                }}
                className={`rounded-[--radius-md] border-2 p-3 text-center transition-all cursor-pointer ${
                  deliveryMode === "door_to_door" ? "border-violet bg-violet/5" : "border-mist"
                }`}
              >
                <Truck size={16} className={deliveryMode === "door_to_door" ? "text-violet mx-auto" : "text-slate-light mx-auto"} />
                <p className="text-xs font-semibold mt-1">Door-to-Door</p>
              </button>
              <button
                onClick={() => {
                  setDeliveryMode("pickup_office");
                  setSelectedLogistics(LOGISTICS_OPTIONS[2]);
                }}
                className={`rounded-[--radius-md] border-2 p-3 text-center transition-all cursor-pointer ${
                  deliveryMode === "pickup_office" ? "border-violet bg-violet/5" : "border-mist"
                }`}
              >
                <Building2 size={16} className={deliveryMode === "pickup_office" ? "text-violet mx-auto" : "text-slate-light mx-auto"} />
                <p className="text-xs font-semibold mt-1">Pickup Office</p>
              </button>
            </div>
          </Card>

          {/* Logistics partner — estimate only. Real partners + fees
              live in logistics_partners.delivery_fee_kobo and are picked
              on the checkout page. */}
          <Card padding="sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-midnight">Estimated delivery</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-lighter shrink-0">
                Pick at checkout
              </span>
            </div>
            <div className="space-y-2">
              {LOGISTICS_OPTIONS.filter((l) => l.type === deliveryMode).map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLogistics(l)}
                  className={`w-full rounded-[--radius-md] border-2 p-3 flex items-center justify-between transition-all cursor-pointer ${
                    selectedLogistics.id === l.id ? "border-violet bg-violet/5" : "border-mist"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-left">{l.name}</p>
                    <p className="text-xs text-slate-light">{l.eta}</p>
                  </div>
                  <p className="text-sm font-bold text-violet">{formatNaira(l.fee / 100)}</p>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] text-slate-light leading-snug">
              Final fee + partner confirmed on the checkout page.
            </p>
          </Card>

          {/* Summary */}
          <Card padding="sm" className="bg-midnight text-white">
            <p className="text-sm font-semibold mb-3">Order Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Subtotal ({items.length} items)</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Logistics</span>
                <span>{formatNaira(logisticsFee)}</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-gold">{formatNaira(total)}</span>
              </div>
            </div>

            <Button
              variant="gold"
              size="lg"
              className="w-full mt-4"
              onClick={() => router.push("/dashboard/checkout")}
            >
              Proceed to Payment
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </Card>

          {/* Trust footer */}
          <div className="flex items-center gap-2 p-3 rounded-[--radius-md] bg-violet/5 border border-violet/10">
            <Lock size={14} className="text-violet shrink-0" />
            <p className="text-xs text-slate-light">
              <strong className="text-midnight">Escrow protected.</strong> Your payment is held until you confirm delivery.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-[--radius-md] bg-emerald/5 border border-emerald/10">
            <ShieldCheck size={14} className="text-emerald shrink-0" />
            <p className="text-xs text-slate-light">
              <strong className="text-midnight">Verified sellers only.</strong> Every seller is KYC verified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
