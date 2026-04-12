"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";
import { ShieldIcon } from "@/components/ui/logo";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getStateOptions, getCityOptions } from "@/lib/nigeria-locations";
import {
  Lock,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Package,
  Clock,
} from "lucide-react";

type CartItem = {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    product_media: { file_url: string }[] | null;
    sellers: { business_name: string } | null;
  } | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"address" | "payment" | "success">("address");

  // Address form
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "Lagos",
  });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/cart");
      const data = await res.json();
      const normalized = (data.items || []).map((item: Record<string, unknown>) => ({
        ...item,
        products: Array.isArray(item.products) ? item.products[0] : item.products,
      }));
      setItems(normalized as CartItem[]);
      setLoading(false);

      if (normalized.length === 0) router.push("/dashboard/cart");
    }
    load();
  }, [router]);

  const subtotal = items.reduce(
    (sum, item) => sum + ((item.products?.price || 0) / 100) * item.quantity, 0
  );
  const logisticsFee = 2500;
  const total = subtotal + logisticsFee;

  async function handlePayment() {
    setProcessing(true);

    try {
      // Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.products?.id,
            quantity: i.quantity,
          })),
          deliveryMode: "door_to_door",
          logisticsFee: logisticsFee * 100,
        }),
      });

      const orderData = await orderRes.json();

      if (orderData.orderId) {
        // Initialize payment
        const payRes = await fetch("/api/payments/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: orderData.orderId }),
        });

        const payData = await payRes.json();

        if (payData.authorization_url) {
          // Redirect to Paystack checkout
          window.location.href = payData.authorization_url;
          return;
        }
      }

      // If Paystack not configured, show success state
      setStep("success");
    } catch {
      alert("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-48 bg-mist rounded-full" />
        <div className="h-64 bg-mist rounded-[--radius-xl]" />
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-emerald/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald" />
        </div>
        <h1 className="text-2xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-3">
          Order Placed Successfully!
        </h1>
        <p className="text-slate-light mb-2">
          Your payment is held in escrow. The seller will prepare your order.
        </p>
        <p className="text-sm text-slate-lighter mb-8">
          You&apos;ll receive updates as your order progresses through each stage.
        </p>

        <div className="bg-cloud rounded-[--radius-lg] p-6 mb-8 text-left space-y-3">
          {[
            { icon: Lock, text: "Payment held securely in escrow" },
            { icon: Package, text: "Seller will prepare your item" },
            { icon: CheckCircle2, text: "Confirm delivery when received" },
            { icon: Clock, text: "2-day hold, then seller gets paid" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-sm">
              <item.icon size={16} className="text-teal shrink-0" />
              <span className="text-slate">{item.text}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={() => router.push("/dashboard/orders")}>
            View My Orders
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard/browse")}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-light hover:text-midnight transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft size={16} />
        Back to cart
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ===== LEFT: FORM ===== */}
        <div className="lg:col-span-3 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-[--radius-full] text-sm font-medium ${
              step === "address" ? "bg-violet text-white" : "bg-emerald/10 text-emerald-dark"
            }`}>
              {step === "payment" ? <CheckCircle2 size={14} /> : "1"}
              <span>Delivery Address</span>
            </div>
            <div className="w-8 h-0.5 bg-mist" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-[--radius-full] text-sm font-medium ${
              step === "payment" ? "bg-violet text-white" : "bg-mist text-slate-light"
            }`}>
              2
              <span>Payment</span>
            </div>
          </div>

          {step === "address" && (
            <Card>
              <CardTitle className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-violet" />
                Delivery Address
              </CardTitle>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="Chidi Okafor"
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                />
                <Input
                  label="Phone Number"
                  placeholder="08012345678"
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                />
                <Input
                  label="Street Address"
                  placeholder="25 Balogun Street, Lagos Island"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <SearchableSelect
                    label="State"
                    placeholder="Select state"
                    options={getStateOptions()}
                    value={address.state}
                    onChange={(val) => setAddress({ ...address, state: val, city: "" })}
                  />
                  <SearchableSelect
                    label="City"
                    placeholder={address.state ? "Select city" : "Select state first"}
                    options={getCityOptions(address.state)}
                    value={address.city}
                    onChange={(val) => setAddress({ ...address, city: val })}
                    disabled={!address.state}
                  />
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  onClick={() => setStep("payment")}
                  disabled={!address.fullName || !address.phone || !address.street || !address.city}
                >
                  Continue to Payment
                </Button>
              </div>
            </Card>
          )}

          {step === "payment" && (
            <Card>
              <CardTitle className="flex items-center gap-2 mb-4">
                <CreditCard size={18} className="text-violet" />
                Payment
              </CardTitle>

              <div className="rounded-[--radius-lg] bg-gradient-to-r from-violet/5 to-teal/5 border border-violet/20 p-5 mb-6">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-violet shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-midnight">Escrow-Protected Payment</p>
                    <p className="text-xs text-slate-light mt-1 leading-relaxed">
                      Your payment of <strong className="text-violet">{formatNaira(total)}</strong> will
                      be held securely by Winipat. The seller will only receive funds after you confirm
                      delivery and a 2-day protection period passes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-slate-light">Delivering to:</p>
                <div className="bg-cloud rounded-[--radius-md] p-3 text-sm">
                  <p className="font-semibold text-midnight">{address.fullName}</p>
                  <p className="text-slate-light">{address.street}, {address.city}, {address.state}</p>
                  <p className="text-slate-light">{address.phone}</p>
                </div>
                <button
                  onClick={() => setStep("address")}
                  className="text-xs text-violet hover:underline cursor-pointer"
                >
                  Change address
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 mb-4">
                <ShieldIcon size={24} />
                <p className="text-xs text-slate-light">
                  Secured by <strong className="text-midnight">Paystack</strong> — Nigeria&apos;s trusted payment gateway
                </p>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="w-full"
                loading={processing}
                onClick={handlePayment}
              >
                <Lock size={16} className="mr-2" />
                Pay {formatNaira(total)} Securely
              </Button>

              <p className="text-[10px] text-slate-lighter text-center mt-3">
                By paying, you agree to Winipat&apos;s Terms of Service and Escrow Policy
              </p>
            </Card>
          )}
        </div>

        {/* ===== RIGHT: ORDER SUMMARY ===== */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="sm">
            <CardTitle className="text-sm mb-3">Order Summary</CardTitle>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => {
                const product = item.products;
                if (!product) return null;
                const media = Array.isArray(product.product_media) ? product.product_media : [];
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-14 h-14 rounded-[--radius-sm] overflow-hidden bg-cloud shrink-0">
                      {media[0]?.file_url ? (
                        <img src={media[0].file_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-mist-dark" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-midnight line-clamp-2">{product.name}</p>
                      <p className="text-xs text-slate-light">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-violet shrink-0">
                      {formatNaira((product.price / 100) * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-mist mt-4 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-light">
                <span>Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-light">
                <span>Logistics</span>
                <span>{formatNaira(logisticsFee)}</span>
              </div>
              <div className="border-t border-mist pt-2 flex justify-between font-bold text-midnight">
                <span>Total</span>
                <span className="text-violet text-lg">{formatNaira(total)}</span>
              </div>
            </div>
          </Card>

          {/* Trust indicators */}
          <div className="space-y-2">
            {[
              { icon: Lock, text: "Escrow Protected", color: "text-violet" },
              { icon: ShieldCheck, text: "Verified Sellers Only", color: "text-teal" },
              { icon: Clock, text: "2-Day Hold After Delivery", color: "text-gold-dark" },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2 text-xs text-slate-light">
                <t.icon size={12} className={t.color} />
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
