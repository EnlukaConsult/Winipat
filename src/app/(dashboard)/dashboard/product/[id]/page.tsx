"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";
import {
  ShieldCheck,
  Truck,
  Lock,
  Star,
  ArrowLeft,
  ShoppingCart,
  MessageSquare,
  Package,
  Clock,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Building2,
  AlertTriangle,
  Heart,
} from "lucide-react";
import React from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  stock_quantity: number;
  created_at: string;
  categories: { name: string; slug: string } | null;
  sellers: {
    id: string;
    business_name: string;
    status: string;
    description: string;
    pickup_address: string;
  } | null;
  product_media: { file_url: string; media_type: string }[] | null;
};

type TrustScore = {
  average_rating: number;
  total_reviews: number;
  dispute_rate: number;
  on_time_rate: number;
  badge: string | null;
};

const LOGISTICS_PARTNERS = [
  { id: "gig", name: "GIG Logistics", fee: 250000, eta: "2-4 days", type: "door_to_door" },
  { id: "dhl", name: "DHL Express", fee: 450000, eta: "1-2 days", type: "door_to_door" },
  { id: "fedex", name: "FedEx Nigeria", fee: 400000, eta: "2-3 days", type: "door_to_door" },
  { id: "pickup", name: "Pickup Office (GIG)", fee: 150000, eta: "2-4 days", type: "pickup_office" },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] = useState(LOGISTICS_PARTNERS[0]);
  const [deliveryMode, setDeliveryMode] = useState<"door_to_door" | "pickup_office">("door_to_door");
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, description, stock_quantity, created_at, categories(name, slug), sellers(id, business_name, status, description, pickup_address), product_media(file_url, media_type)"
        )
        .eq("id", id)
        .single();

      if (data) {
        const p = data as unknown as Product;
        setProduct(p);

        // Fetch trust score for seller
        if (p.sellers?.id) {
          const { data: ts } = await supabase
            .from("trust_scores")
            .select("average_rating, total_reviews, dispute_rate, on_time_rate, badge")
            .eq("seller_id", p.sellers.id)
            .single();
          if (ts) setTrustScore(ts as TrustScore);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleAddToCart() {
    if (!product) return;
    setAddingToCart(true);
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      router.push("/dashboard/cart");
    } catch {
      alert("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  }

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.round(rating) ? "fill-gold text-gold" : "fill-mist text-mist-dark"}
      />
    ));

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-32 bg-mist rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[400px] bg-mist rounded-[--radius-xl]" />
          <div className="space-y-4">
            <div className="h-8 bg-mist rounded-full w-3/4" />
            <div className="h-10 bg-mist rounded-full w-1/3" />
            <div className="h-24 bg-mist rounded-[--radius-lg]" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <Package className="h-16 w-16 text-mist-dark mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-midnight font-[family-name:var(--font-sora)]">Product not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/browse")}>
          Back to Browse
        </Button>
      </div>
    );
  }

  const images = product.product_media?.filter((m) => m.media_type === "image") || [];
  const mainImage = images[activeImage]?.file_url || "/images/products/handbags-collection.jpg";
  const productPrice = product.price / 100;
  const logisticsFee = selectedLogistics.fee / 100;
  const totalPrice = productPrice * quantity + logisticsFee;
  const commission = productPrice * quantity * 0.12;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-light hover:text-midnight transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ===== LEFT: IMAGES ===== */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative rounded-[--radius-xl] overflow-hidden bg-white border border-mist shadow-sm">
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-[350px] sm:h-[450px] object-contain bg-cloud"
            />
            {product.sellers?.status === "approved" && (
              <div className="absolute top-4 left-4">
                <Badge variant="success" className="px-3 py-1.5 text-xs bg-white/95 text-emerald-dark shadow-sm">
                  <ShieldCheck size={12} className="mr-1" />
                  Verified Seller
                </Badge>
              </div>
            )}
            <button
              onClick={() => setWishlisted(!wishlisted)}
              className={`absolute top-4 right-4 p-2.5 rounded-full shadow-md transition-all cursor-pointer ${
                wishlisted ? "bg-error text-white" : "bg-white/95 text-slate hover:text-error"
              }`}
            >
              <Heart size={18} className={wishlisted ? "fill-current" : ""} />
            </button>
          </div>

          {/* Image thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-16 h-16 rounded-[--radius-md] overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImage === i ? "border-violet shadow-md" : "border-mist"
                  }`}
                >
                  <img src={img.file_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Escrow protection banner */}
          <div className="rounded-[--radius-lg] bg-gradient-to-r from-violet/5 to-teal/5 border border-violet/20 p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-violet shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-midnight">Escrow-Protected Purchase</p>
                <p className="text-xs text-slate-light mt-1 leading-relaxed">
                  Your payment is held securely by Winipat. The seller only receives funds after you
                  confirm delivery + a 2-day protection period. If anything is wrong, open a dispute
                  and your money stays protected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT: DETAILS ===== */}
        <div className="space-y-5">
          {/* Category */}
          {product.categories && (
            <Badge variant="royal" className="text-xs">{product.categories.name}</Badge>
          )}

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-midnight font-[family-name:var(--font-sora)] leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {renderStars(trustScore?.average_rating || 4)}
            </div>
            <span className="text-sm text-slate-light">
              {trustScore ? `${trustScore.average_rating} (${trustScore.total_reviews} reviews)` : "4.0 (New)"}
            </span>
            {trustScore?.badge && (
              <Badge variant="gold" className="text-xs">
                <ShieldCheck size={10} className="mr-0.5" />
                {trustScore.badge.replace("_", " ")}
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-bold text-violet font-[family-name:var(--font-sora)]">
              {formatNaira(productPrice)}
            </p>
            {product.stock_quantity <= 5 && (
              <Badge variant="error" className="text-xs">Only {product.stock_quantity} left!</Badge>
            )}
          </div>

          {/* Description */}
          <div className="bg-cloud rounded-[--radius-lg] p-4">
            <p className="text-sm text-slate leading-relaxed">{product.description}</p>
          </div>

          {/* Seller info */}
          <Card padding="sm" className="border-violet/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet to-teal flex items-center justify-center text-white text-sm font-bold">
                  {product.sellers?.business_name?.charAt(0) || "S"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-midnight">{product.sellers?.business_name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-light">
                    <MapPin size={11} />
                    <span>{product.sellers?.pickup_address || "Lagos, Nigeria"}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <MessageSquare size={14} className="mr-1" />
                Message
              </Button>
            </div>
            {trustScore && (
              <div className="mt-3 pt-3 border-t border-mist grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-midnight">{(trustScore.on_time_rate * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-slate-light">On-time</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-midnight">{(trustScore.dispute_rate * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-light">Dispute rate</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-midnight">{trustScore.total_reviews}</p>
                  <p className="text-[10px] text-slate-light">Reviews</p>
                </div>
              </div>
            )}
          </Card>

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-slate">Quantity</p>
            <div className="flex items-center border border-mist rounded-[--radius-md]">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-slate hover:bg-cloud transition-colors cursor-pointer"
              >
                -
              </button>
              <span className="px-4 py-2 text-sm font-semibold text-midnight border-x border-mist">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                className="px-3 py-2 text-slate hover:bg-cloud transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
            <span className="text-xs text-slate-light">{product.stock_quantity} available</span>
          </div>

          {/* Delivery mode */}
          <div>
            <p className="text-sm font-medium text-slate mb-2">Delivery Mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setDeliveryMode("door_to_door");
                  setSelectedLogistics(LOGISTICS_PARTNERS[0]);
                }}
                className={`rounded-[--radius-md] border-2 p-3 text-left transition-all cursor-pointer ${
                  deliveryMode === "door_to_door"
                    ? "border-violet bg-violet/5"
                    : "border-mist hover:border-mist-dark"
                }`}
              >
                <Truck size={18} className={deliveryMode === "door_to_door" ? "text-violet" : "text-slate-light"} />
                <p className="text-sm font-semibold mt-1">Door-to-Door</p>
                <p className="text-xs text-slate-light">Delivered to your address</p>
              </button>
              <button
                onClick={() => {
                  setDeliveryMode("pickup_office");
                  setSelectedLogistics(LOGISTICS_PARTNERS[3]);
                }}
                className={`rounded-[--radius-md] border-2 p-3 text-left transition-all cursor-pointer ${
                  deliveryMode === "pickup_office"
                    ? "border-violet bg-violet/5"
                    : "border-mist hover:border-mist-dark"
                }`}
              >
                <Building2 size={18} className={deliveryMode === "pickup_office" ? "text-violet" : "text-slate-light"} />
                <p className="text-sm font-semibold mt-1">Pickup Office</p>
                <p className="text-xs text-slate-light">Collect from partner office</p>
              </button>
            </div>
          </div>

          {/* Logistics partner selection */}
          {deliveryMode === "door_to_door" && (
            <div>
              <p className="text-sm font-medium text-slate mb-2">Choose Logistics Partner</p>
              <div className="space-y-2">
                {LOGISTICS_PARTNERS.filter((l) => l.type === "door_to_door").map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => setSelectedLogistics(partner)}
                    className={`w-full rounded-[--radius-md] border-2 p-3 flex items-center justify-between transition-all cursor-pointer ${
                      selectedLogistics.id === partner.id
                        ? "border-violet bg-violet/5"
                        : "border-mist hover:border-mist-dark"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck size={16} className="text-violet" />
                      <div className="text-left">
                        <p className="text-sm font-semibold">{partner.name}</p>
                        <p className="text-xs text-slate-light">{partner.eta} delivery</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-violet">{formatNaira(partner.fee / 100)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order summary */}
          <Card padding="sm" className="bg-midnight text-white">
            <CardTitle className="text-white text-sm mb-3">Order Summary</CardTitle>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Product ({quantity}x)</span>
                <span>{formatNaira(productPrice * quantity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Logistics ({selectedLogistics.name})</span>
                <span>{formatNaira(logisticsFee)}</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-gold">{formatNaira(totalPrice)}</span>
              </div>
            </div>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="gold"
              size="lg"
              className="flex-1"
              loading={addingToCart}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={18} className="mr-2" />
              Add to Cart & Pay
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setWishlisted(!wishlisted)}
              className={wishlisted ? "text-error border-error" : ""}
            >
              <Heart size={18} className={wishlisted ? "fill-current" : ""} />
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Lock, text: "Escrow Protected", sub: "Funds held until delivery" },
              { icon: ShieldCheck, text: "Verified Seller", sub: "KYC + bank verified" },
              { icon: Clock, text: "2-Day Hold", sub: "Extra protection period" },
              { icon: AlertTriangle, text: "Dispute Support", sub: "Evidence-based resolution" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-2 p-2.5 rounded-[--radius-md] bg-cloud">
                <item.icon size={14} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-midnight">{item.text}</p>
                  <p className="text-[10px] text-slate-light">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* How escrow works */}
          <div className="rounded-[--radius-lg] bg-cloud p-4">
            <p className="text-xs font-semibold text-midnight mb-3 flex items-center gap-1.5">
              <Lock size={12} className="text-violet" />
              How your payment is protected
            </p>
            <div className="space-y-3">
              {[
                { step: "1", text: "You pay — funds held by Winipat in escrow" },
                { step: "2", text: "Seller prepares item & logistics picks up" },
                { step: "3", text: "You receive & confirm delivery" },
                { step: "4", text: "2-day hold period for extra safety" },
                { step: "5", text: "Seller gets paid (minus 12% commission)" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-violet/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-violet">{item.step}</span>
                  </div>
                  <p className="text-xs text-slate-light">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
