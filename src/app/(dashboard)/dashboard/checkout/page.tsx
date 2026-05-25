"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils";
import { ShieldIcon } from "@/components/ui/logo";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getStateOptions, getCityOptions } from "@/lib/nigeria-locations";
import { createClient } from "@/lib/supabase/client";
import {
  Lock,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Package,
  Clock,
  Truck,
  Plus,
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

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  is_default: boolean;
};

type LogisticsPartner = {
  id: string;
  name: string;
  description: string | null;
};

// V1 flat rates per partner (in kobo). Real per-route pricing comes later;
// for now the buyer sees a fixed quote on checkout so the escrow math is
// deterministic. Logistics fee is NOT held in escrow — it goes to the
// partner; only product subtotal is escrowed.
const PARTNER_FEES_KOBO: Record<string, number> = {
  "GIG Logistics": 250000,
  Sendbox: 180000,
  "Kwik Delivery": 150000,
};
const DEFAULT_LOGISTICS_FEE_KOBO = 250000;

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [partners, setPartners] = useState<LogisticsPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"address" | "logistics" | "payment" | "success">(
    "address"
  );

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  // Inline "new address" form
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    street: "",
    city: "",
    state: "Lagos",
    is_default: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [cartRes, addrRes, partnerRes] = await Promise.all([
        fetch("/api/cart").then((r) => r.json()),
        supabase
          .from("addresses")
          .select("id, label, street, city, state, is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false }),
        supabase
          .from("logistics_partners")
          .select("id, name, description")
          .eq("is_active", true)
          .order("name"),
      ]);

      const normalized = (cartRes.items || []).map((item: Record<string, unknown>) => ({
        ...item,
        products: Array.isArray(item.products) ? item.products[0] : item.products,
      }));
      setItems(normalized as CartItem[]);

      if (normalized.length === 0) {
        router.push("/dashboard/cart");
        return;
      }

      const addrs = (addrRes.data as Address[]) || [];
      setAddresses(addrs);
      const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else setShowNewAddress(true);

      const parts = (partnerRes.data as LogisticsPartner[]) || [];
      setPartners(parts);
      if (parts[0]) setSelectedPartnerId(parts[0].id);

      setLoading(false);
    }
    load();
  }, [router]);

  const subtotal = items.reduce(
    (sum, item) => sum + ((item.products?.price || 0) / 100) * item.quantity,
    0
  );

  const logisticsFeeKobo = (() => {
    const partner = partners.find((p) => p.id === selectedPartnerId);
    if (!partner) return DEFAULT_LOGISTICS_FEE_KOBO;
    return PARTNER_FEES_KOBO[partner.name] ?? DEFAULT_LOGISTICS_FEE_KOBO;
  })();
  const logisticsFee = logisticsFeeKobo / 100;
  const total = subtotal + logisticsFee;

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  async function saveNewAddress() {
    if (!newAddress.street || !newAddress.city || !newAddress.state) return;
    setSavingAddress(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...newAddress, user_id: user.id })
      .select("id, label, street, city, state, is_default")
      .single();

    setSavingAddress(false);
    if (error || !data) {
      alert("Failed to save address. Please try again.");
      return;
    }

    setAddresses((prev) => [data as Address, ...prev]);
    setSelectedAddressId((data as Address).id);
    setShowNewAddress(false);
    setNewAddress({ label: "Home", street: "", city: "", state: "Lagos", is_default: false });
  }

  async function handlePayment() {
    if (!selectedAddressId || !selectedPartnerId) return;
    setProcessing(true);

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.products?.id,
            quantity: i.quantity,
          })),
          deliveryMode: "door_to_door",
          deliveryAddressId: selectedAddressId,
          logisticsPartnerId: selectedPartnerId,
          logisticsFee: logisticsFeeKobo,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.orderId) {
        alert(orderData.error || "Could not create order. Please try again.");
        return;
      }

      const payRes = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });

      const payData = await payRes.json();

      if (payData.authorization_url) {
        window.location.href = payData.authorization_url;
        return;
      }

      // No Paystack configured — fallback to success screen
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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {(
              [
                { key: "address",   label: "Address" },
                { key: "logistics", label: "Delivery" },
                { key: "payment",   label: "Payment" },
              ] as const
            ).map((s, idx, arr) => {
              const currentIdx = arr.findIndex((x) => x.key === step);
              const isActive = step === s.key;
              const isDone = idx < currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-[--radius-full] text-xs font-medium ${
                      isActive
                        ? "bg-violet text-white"
                        : isDone
                        ? "bg-emerald/10 text-emerald-dark"
                        : "bg-mist text-slate-light"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                    <span>{s.label}</span>
                  </div>
                  {idx < arr.length - 1 && <div className="w-6 h-0.5 bg-mist" />}
                </div>
              );
            })}
          </div>

          {/* ===== STEP 1: ADDRESS ===== */}
          {step === "address" && (
            <Card>
              <CardTitle className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-violet" />
                Delivery Address
              </CardTitle>

              <div className="space-y-2 mb-4">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setShowNewAddress(false);
                    }}
                    className={`w-full text-left rounded-[--radius-md] border-2 p-4 transition-colors ${
                      selectedAddressId === addr.id && !showNewAddress
                        ? "border-violet bg-violet/5"
                        : "border-mist hover:border-mist-dark"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-midnight">{addr.label}</p>
                      {addr.is_default && <Badge variant="royal">Default</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-light">
                      {addr.street}, {addr.city}, {addr.state}
                    </p>
                  </button>
                ))}

                {!showNewAddress && (
                  <button
                    type="button"
                    onClick={() => setShowNewAddress(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-[--radius-md] border-2 border-dashed border-mist-dark py-3 text-sm text-slate-light hover:text-violet hover:border-violet/40 transition-colors"
                  >
                    <Plus size={14} />
                    Add new address
                  </button>
                )}
              </div>

              {showNewAddress && (
                <div className="rounded-[--radius-md] border border-violet/20 bg-violet/5 p-4 space-y-3 mb-4">
                  <p className="text-sm font-semibold text-midnight">New Address</p>
                  <Input
                    label="Label"
                    placeholder="Home, Office, etc."
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  />
                  <Input
                    label="Street Address"
                    placeholder="25 Balogun Street"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <SearchableSelect
                      label="State"
                      placeholder="Select state"
                      options={getStateOptions()}
                      value={newAddress.state}
                      onChange={(val) => setNewAddress({ ...newAddress, state: val, city: "" })}
                    />
                    <SearchableSelect
                      label="City"
                      placeholder={newAddress.state ? "Select city" : "Select state first"}
                      options={getCityOptions(newAddress.state)}
                      value={newAddress.city}
                      onChange={(val) => setNewAddress({ ...newAddress, city: val })}
                      disabled={!newAddress.state}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={saveNewAddress}
                      loading={savingAddress}
                      disabled={!newAddress.street || !newAddress.city || !newAddress.state}
                    >
                      Save Address
                    </Button>
                    {addresses.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewAddress(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setStep("logistics")}
                disabled={!selectedAddressId || showNewAddress}
              >
                Continue
              </Button>

              <p className="mt-3 text-xs text-slate-lighter text-center">
                Manage all addresses on your{" "}
                <Link href="/dashboard/profile" className="text-violet hover:underline">
                  profile page
                </Link>
                .
              </p>
            </Card>
          )}

          {/* ===== STEP 2: LOGISTICS ===== */}
          {step === "logistics" && (
            <Card>
              <CardTitle className="flex items-center gap-2 mb-4">
                <Truck size={18} className="text-violet" />
                Delivery Partner
              </CardTitle>

              {partners.length === 0 ? (
                <div className="rounded-[--radius-md] bg-warn/8 border border-warn/20 p-4 text-sm text-warn">
                  No delivery partners are currently active. Please contact support.
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {partners.map((p) => {
                    const fee = (PARTNER_FEES_KOBO[p.name] ?? DEFAULT_LOGISTICS_FEE_KOBO) / 100;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPartnerId(p.id)}
                        className={`w-full text-left rounded-[--radius-md] border-2 p-4 transition-colors ${
                          selectedPartnerId === p.id
                            ? "border-violet bg-violet/5"
                            : "border-mist hover:border-mist-dark"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-midnight">{p.name}</p>
                            {p.description && (
                              <p className="mt-0.5 text-xs text-slate-light">{p.description}</p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-violet shrink-0">
                            {formatNaira(fee)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={() => setStep("address")}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep("payment")}
                  disabled={!selectedPartnerId}
                >
                  Continue to Payment
                </Button>
              </div>
            </Card>
          )}

          {/* ===== STEP 3: PAYMENT ===== */}
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
                    <p className="text-sm font-semibold text-midnight">
                      Escrow-Protected Payment
                    </p>
                    <p className="text-xs text-slate-light mt-1 leading-relaxed">
                      Your payment of <strong className="text-violet">{formatNaira(total)}</strong>{" "}
                      will be processed via Paystack. The product amount of{" "}
                      <strong className="text-midnight">{formatNaira(subtotal)}</strong> is held
                      in escrow and released to the seller 2 days after you confirm delivery.
                      The {formatNaira(logisticsFee)} logistics fee goes directly to the
                      delivery partner.
                    </p>
                  </div>
                </div>
              </div>

              {selectedAddress && (
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-slate-light">Delivering to:</p>
                  <div className="bg-cloud rounded-[--radius-md] p-3 text-sm">
                    <p className="font-semibold text-midnight">{selectedAddress.label}</p>
                    <p className="text-slate-light">
                      {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("address")}
                    className="text-xs text-violet hover:underline cursor-pointer"
                  >
                    Change address
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mb-4">
                <ShieldIcon size={24} />
                <p className="text-xs text-slate-light">
                  Secured by <strong className="text-midnight">Paystack</strong> — Nigeria&apos;s
                  trusted payment gateway
                </p>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="w-full"
                loading={processing}
                onClick={handlePayment}
                disabled={!selectedAddressId || !selectedPartnerId}
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={media[0].file_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-mist-dark" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-midnight line-clamp-2">
                        {product.name}
                      </p>
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
