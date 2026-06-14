"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  Truck,
  Lock,
  Star,
  ShoppingCart,
  MessageSquare,
  Package,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Heart,
  Camera,
  Flame,
  Zap,
  X,
  PenLine,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import React from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  stock_quantity: number;
  units_sold: number;
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

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  buyer: { full_name: string } | null;
  has_media: boolean;
};

type EligibleOrder = {
  id: string;
  created_at: string;
  total: number;
  order_number: string;
};

const LOGISTICS_PARTNERS = [
  { id: "gig",    name: "GIG Logistics",  fee: 250000, eta: "2–4 days" },
  { id: "dhl",    name: "DHL Express",    fee: 450000, eta: "1–2 days" },
  { id: "fedex",  name: "FedEx Nigeria",  fee: 400000, eta: "2–3 days" },
];

type ReviewFilter = "recommended" | "recent" | "five_star" | "with_photos";

const REVIEW_FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "recent",      label: "Most recent" },
  { key: "five_star",   label: "5 stars" },
  { key: "with_photos", label: "With photos" },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] = useState(LOGISTICS_PARTNERS[0]);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [contactingSeller, setContactingSeller] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("recommended");
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Review-submission flow
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, description, stock_quantity, units_sold, created_at, categories(name, slug), sellers(id, business_name, status, description, pickup_address), product_media(file_url, media_type)"
        )
        .eq("id", id)
        .single();

      if (data) {
        const p = data as unknown as Product;
        setProduct(p);

        if (p.sellers?.id) {
          const [{ data: ts }, reviewsList, { data: { user } }] = await Promise.all([
            supabase
              .from("trust_scores")
              .select("average_rating, total_reviews, dispute_rate, on_time_rate, badge")
              .eq("seller_id", p.sellers.id)
              .single(),
            loadSellerReviews(supabase, p.sellers.id),
            supabase.auth.getUser(),
          ]);
          if (ts) setTrustScore(ts as TrustScore);
          setReviews(reviewsList);

          // Check this buyer's completed orders with this seller that haven't
          // been reviewed yet — used to gate the "Write a review" button.
          if (user) {
            setCurrentUserId(user.id);
            const { data: orders } = await supabase
              .from("orders")
              .select("id, order_number, created_at, total, reviews(id)")
              .eq("buyer_id", user.id)
              .eq("seller_id", p.sellers.id)
              .eq("status", "completed")
              .order("created_at", { ascending: false });
            if (orders) {
              const eligible: EligibleOrder[] = (orders as unknown as Array<Record<string, unknown>>)
                .filter((o) => {
                  const rv = o.reviews as unknown[] | undefined;
                  return !rv || rv.length === 0;
                })
                .map((o) => ({
                  id: o.id as string,
                  order_number: o.order_number as string,
                  created_at: o.created_at as string,
                  total: o.total as number,
                }));
              setEligibleOrders(eligible);
              if (eligible.length > 0) setSelectedOrderId(eligible[0].id);
            }
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function submitReview() {
    if (!selectedOrderId) {
      setReviewError("Select which order you're reviewing.");
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please pick a rating from 1 to 5 stars.");
      return;
    }
    setSubmittingReview(true);
    setReviewError("");
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviewError(body.error || "Could not submit review. Please try again.");
        return;
      }
      setReviewSuccess(true);

      // Refresh reviews + trust score so the new entry shows immediately.
      if (product?.sellers?.id) {
        const supabase = createClient();
        const [reviewsList, { data: ts }] = await Promise.all([
          loadSellerReviews(supabase, product.sellers.id),
          supabase
            .from("trust_scores")
            .select("average_rating, total_reviews, dispute_rate, on_time_rate, badge")
            .eq("seller_id", product.sellers.id)
            .single(),
        ]);
        setReviews(reviewsList);
        if (ts) setTrustScore(ts as TrustScore);
      }

      setEligibleOrders((prev) => {
        const next = prev.filter((o) => o.id !== selectedOrderId);
        setSelectedOrderId(next[0]?.id ?? "");
        return next;
      });

      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewRating(0);
        setReviewHoverRating(0);
        setReviewComment("");
        setReviewSuccess(false);
      }, 1400);
    } finally {
      setSubmittingReview(false);
    }
  }

  function openReviewModal() {
    if (!currentUserId) {
      router.push(`/login?next=/dashboard/product/${id}`);
      return;
    }
    if (eligibleOrders.length === 0) return;
    setReviewError("");
    setReviewSuccess(false);
    setReviewModalOpen(true);
  }

  function closeReviewModal() {
    if (submittingReview) return;
    setReviewModalOpen(false);
    setReviewError("");
  }

  async function contactSeller() {
    if (!product?.sellers?.id) return;
    setContactingSeller(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: product.sellers.id }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/dashboard/product/${id}`);
        return;
      }
      const body = await res.json();
      if (!res.ok || !body.id) {
        alert(body.error || "Could not start conversation.");
        return;
      }
      router.push(`/dashboard/messages?conv=${body.id}`);
    } finally {
      setContactingSeller(false);
    }
  }

  async function handleAddToCart(thenCheckout = false) {
    if (!product) return;
    if (thenCheckout) setBuyingNow(true);
    else setAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/dashboard/product/${id}`);
        return;
      }
      router.push(thenCheckout ? "/dashboard/checkout" : "/dashboard/cart");
    } catch {
      alert("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
      setBuyingNow(false);
    }
  }

  // ----- Review filtering -----
  const filteredReviews = useMemo(() => {
    let r = [...reviews];
    if (reviewFilter === "recent")      r.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (reviewFilter === "five_star")   r = r.filter((x) => x.rating === 5);
    if (reviewFilter === "with_photos") r = r.filter((x) => x.has_media);
    return r;
  }, [reviews, reviewFilter]);

  const visibleReviews = showAllReviews ? filteredReviews : filteredReviews.slice(0, 4);

  const reviewCounts = useMemo(() => {
    return {
      total:      reviews.length,
      five_star:  reviews.filter((r) => r.rating === 5).length,
      with_photos: reviews.filter((r) => r.has_media).length,
    };
  }, [reviews]);

  const renderStars = (rating: number, size = 14) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={size}
        className={i < Math.round(rating) ? "fill-gold text-gold" : "fill-mist text-mist-dark"}
        aria-hidden="true"
      />
    ));

  // Real units sold (Bug 4) — backed by products.units_sold.
  const soldCount = product?.units_sold ?? 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-4 w-48 bg-mist rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-[500px] bg-mist rounded-xl" />
          <div className="lg:col-span-5 space-y-3">
            <div className="h-6 bg-mist rounded-full w-3/4" />
            <div className="h-10 bg-mist rounded-full w-1/2" />
            <div className="h-32 bg-mist rounded-xl" />
            <div className="h-12 bg-mist rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <Package className="h-16 w-16 text-mist-dark mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-midnight font-[family-name:var(--font-sora)]">
          Product not found
        </h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/browse")}
        >
          Back to Browse
        </Button>
      </div>
    );
  }

  const images = product.product_media?.filter((m) => m.media_type === "image") || [];
  const mainImage = images[activeImage]?.file_url || "/images/products/handbags-collection.jpg";
  const productPrice = product.price / 100;
  const totalPrice = productPrice * quantity;
  // Real rating (Bug 4) — default to 0 (no invented 4.6); only show stars when
  // there are actual reviews. No synthetic RRP/discount (Bug 6).
  const reviewTotal = trustScore?.total_reviews ?? reviewCounts.total;
  const ratingValue = trustScore?.average_rating ?? 0;
  const hasRating = reviewTotal > 0 && ratingValue > 0;
  const isTopRated = ratingValue >= 4.5 && reviewTotal >= 20;

  return (
    <div className="max-w-7xl mx-auto pb-24 lg:pb-6">
      {/* ===== Breadcrumb ===== */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-light mb-4 flex items-center gap-1.5">
        <Link href="/dashboard/browse" className="hover:text-violet">Home</Link>
        <ChevronRight size={12} aria-hidden="true" />
        {product.categories && (
          <>
            <Link
              href={`/dashboard/browse?category=${product.categories.slug}`}
              className="hover:text-violet"
            >
              {product.categories.name}
            </Link>
            <ChevronRight size={12} aria-hidden="true" />
          </>
        )}
        <span className="text-midnight truncate max-w-[220px] sm:max-w-md">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* ===== LEFT: gallery ===== */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex gap-3">
            {/* Vertical thumbs (desktop only) */}
            {images.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2 shrink-0">
                {images.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    onMouseEnter={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                      activeImage === i ? "border-violet" : "border-mist hover:border-mist-dark"
                    }`}
                    aria-label={`Image ${i + 1} of ${images.length}`}
                    aria-current={activeImage === i ? "true" : "false"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.file_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="relative flex-1 rounded-xl overflow-hidden bg-white border border-mist">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mainImage}
                alt={product.name}
                className="w-full aspect-square object-contain bg-cloud"
              />

              {/* Top-left badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {product.sellers?.status === "approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-dark shadow-sm">
                    <ShieldCheck size={12} aria-hidden="true" />
                    Verified seller
                  </span>
                )}
                {isTopRated && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald text-white px-2.5 py-1 text-[11px] font-semibold shadow-sm">
                    Top rated
                  </span>
                )}
              </div>

              {/* Wishlist */}
              <button
                onClick={() => setWishlisted(!wishlisted)}
                className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  wishlisted ? "bg-error text-white" : "bg-white/95 text-slate hover:text-error"
                }`}
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-pressed={wishlisted}
              >
                <Heart size={18} className={wishlisted ? "fill-current" : ""} aria-hidden="true" />
              </button>

              {/* Sold out overlay */}
              {product.stock_quantity === 0 && (
                <div className="absolute inset-0 bg-midnight/70 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">Sold out</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile thumb strip */}
          {images.length > 1 && (
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 ${
                    activeImage === i ? "border-violet" : "border-mist"
                  }`}
                  aria-label={`Image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.file_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Description (under the gallery on mobile too) */}
          <section className="mt-6 rounded-xl border border-mist bg-white">
            <header className="px-4 py-2.5 border-b border-mist">
              <h2 className="text-sm font-semibold text-midnight">About this item</h2>
            </header>
            <div className="px-4 py-3 text-sm text-slate leading-relaxed whitespace-pre-line">
              {product.description || "No description provided by the seller."}
            </div>
          </section>

          {/* Specifications */}
          <section className="rounded-xl border border-mist bg-white">
            <header className="px-4 py-2.5 border-b border-mist">
              <h2 className="text-sm font-semibold text-midnight">Specifications</h2>
            </header>
            <dl className="divide-y divide-mist text-sm">
              <Spec label="Category" value={product.categories?.name || "—"} />
              <Spec
                label="SKU"
                value={
                  <code className="font-mono text-xs">
                    {product.slug?.split("-").pop()?.toUpperCase() || product.id.slice(0, 8).toUpperCase()}
                  </code>
                }
              />
              <Spec
                label="Listed"
                value={new Date(product.created_at).toLocaleDateString("en-NG", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              />
              <Spec label="Escrow hold after delivery" value="48 hours" />
              <Spec
                label="Ships from"
                value={product.sellers?.pickup_address?.split(",").pop()?.trim() || "Nigeria"}
              />
            </dl>
          </section>
        </div>

        {/* ===== RIGHT: purchase column ===== */}
        <div className="lg:col-span-5 space-y-4">
          {/* Title + sold count */}
          <div>
            {product.categories && (
              <Link
                href={`/dashboard/browse?category=${product.categories.slug}`}
                className="text-xs font-semibold text-violet uppercase tracking-wide hover:underline"
              >
                {product.categories.name}
              </Link>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-midnight font-[family-name:var(--font-sora)] leading-tight mt-1">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-light flex-wrap">
              {hasRating ? (
                <span className="flex items-center gap-1">
                  <span className="flex items-center">{renderStars(ratingValue, 12)}</span>
                  <span className="font-semibold text-midnight ml-1">{ratingValue.toFixed(1)}</span>
                  <span>({reviewTotal} reviews)</span>
                </span>
              ) : (
                <span>No reviews yet</span>
              )}
              {soldCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-midnight">{soldCount.toLocaleString()} sold</span>
                </>
              )}
              {isTopRated && (
                <span aria-hidden="true">·</span>
              )}
              {isTopRated && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                  <Flame size={9} className="mr-0.5" aria-hidden="true" />
                  Top rated
                </Badge>
              )}
            </div>
          </div>

          {/* Price block */}
          <div className="rounded-xl bg-gradient-to-br from-violet/5 to-teal/5 border border-violet/15 p-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-violet font-[family-name:var(--font-sora)]">
                {formatNaira(productPrice)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate flex items-center gap-1.5">
              <Lock size={11} className="text-violet" aria-hidden="true" />
              Payment held in escrow · released only after you confirm delivery
            </p>
          </div>

          {/* Stock indicator */}
          <div className="text-sm">
            {product.stock_quantity === 0 ? (
              <span className="text-error font-semibold">Out of stock</span>
            ) : product.stock_quantity <= 5 ? (
              <span className="text-error font-semibold inline-flex items-center gap-1">
                <Zap size={14} aria-hidden="true" />
                Only {product.stock_quantity} left — order soon
              </span>
            ) : product.stock_quantity <= 20 ? (
              <span className="text-amber-600 font-medium">{product.stock_quantity} in stock</span>
            ) : (
              <span className="text-emerald-dark font-medium inline-flex items-center gap-1">
                <CheckCircle2 size={14} aria-hidden="true" />
                In stock — ready to ship
              </span>
            )}
          </div>

          {/* Quantity */}
          <div>
            <p className="text-sm font-medium text-slate mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border-2 border-mist rounded-md overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-midnight hover:bg-cloud min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-midnight border-x-2 border-mist min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  className="px-3 py-2 text-midnight hover:bg-cloud min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-light">
                Max {product.stock_quantity}
              </span>
            </div>
          </div>

          {/* Logistics partner picker */}
          <div>
            <p className="text-sm font-medium text-slate mb-2">Delivery</p>
            <div className="space-y-2">
              {LOGISTICS_PARTNERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedLogistics(p)}
                  className={`w-full flex items-center justify-between gap-2 rounded-md border-2 px-3 py-2.5 text-left transition-all ${
                    selectedLogistics.id === p.id
                      ? "border-violet bg-violet/5"
                      : "border-mist hover:border-mist-dark"
                  }`}
                  aria-pressed={selectedLogistics.id === p.id}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Truck size={14} className="text-violet shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-midnight truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-light">{p.eta}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-violet shrink-0">
                    {formatNaira(p.fee / 100)}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-lighter">
              Final shipping cost confirmed at checkout based on your address.
            </p>
          </div>

          {/* Desktop CTAs (mobile gets a sticky bar at the bottom) */}
          <div className="hidden lg:flex gap-3">
            <Button
              variant="gold"
              size="lg"
              className="flex-1"
              loading={buyingNow}
              disabled={addingToCart || product.stock_quantity === 0}
              onClick={() => handleAddToCart(true)}
            >
              Buy now · {formatNaira(totalPrice)}
            </Button>
            <Button
              variant="outline"
              size="lg"
              loading={addingToCart}
              disabled={buyingNow || product.stock_quantity === 0}
              onClick={() => handleAddToCart(false)}
            >
              <ShoppingCart size={18} className="mr-1.5" aria-hidden="true" />
              Add to cart
            </Button>
          </div>

          {/* Seller card */}
          <section className="rounded-xl border border-mist bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={product.sellers?.id ? `/sellers/${product.sellers.id}` : "#"}
                className="flex items-center gap-3 min-w-0 hover:opacity-80"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet to-teal text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {product.sellers?.business_name?.charAt(0) || "S"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-midnight truncate">
                    {product.sellers?.business_name || "Seller"}
                  </p>
                  <p className="text-xs text-slate-light flex items-center gap-1 truncate">
                    <MapPin size={11} aria-hidden="true" />
                    {product.sellers?.pickup_address?.split(",").pop()?.trim() || "Nigeria"}
                  </p>
                </div>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={contactSeller}
                loading={contactingSeller}
                disabled={!product.sellers?.id}
              >
                <MessageSquare size={14} className="mr-1.5" aria-hidden="true" />
                Message
              </Button>
            </div>
            {trustScore && (
              <div className="mt-3 pt-3 border-t border-mist grid grid-cols-3 gap-2 text-center">
                <Stat label="On-time" value={`${Math.round((trustScore.on_time_rate ?? 0) * 100)}%`} />
                <Stat label="Disputes" value={`${((trustScore.dispute_rate ?? 0) * 100).toFixed(1)}%`} />
                <Stat label="Reviews" value={trustScore.total_reviews.toLocaleString()} />
              </div>
            )}
          </section>

          {/* Trust strip */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <TrustChip icon={Lock} title="Escrow protected" sub="Funds held safe" />
            <TrustChip icon={ShieldCheck} title="KYC verified" sub="ID + bank checked" />
            <TrustChip icon={Truck} title="Tracked delivery" sub="Photo at each step" />
            <TrustChip icon={CheckCircle2} title="Easy disputes" sub="Evidence-based" />
          </div>
        </div>
      </div>

      {/* ===== Reviews section ===== */}
      <section className="mt-10" aria-labelledby="reviews-heading">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 id="reviews-heading" className="text-lg font-bold text-midnight font-[family-name:var(--font-sora)]">
              Customer reviews
            </h2>
            <p className="text-xs text-slate-light mt-1 flex items-center gap-1.5">
              <ShieldCheck size={11} className="text-emerald" aria-hidden="true" />
              All reviews are from verified buyers of this seller
            </p>
          </div>
          {hasRating ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center">{renderStars(ratingValue, 16)}</span>
              <span className="text-sm font-bold text-midnight">{ratingValue.toFixed(1)}</span>
              <span className="text-xs text-slate-light">({reviewTotal})</span>
            </div>
          ) : (
            <span className="text-xs text-slate-light">No reviews yet</span>
          )}
        </div>

        {/* "Write a review" callout — shown to eligible buyers as a prominent
            card; signed-out / non-eligible visitors see context only. */}
        <div className="mb-5 rounded-xl border border-violet/20 bg-gradient-to-r from-violet/5 via-white to-teal/5 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-violet/10 text-violet flex items-center justify-center shrink-0">
              <PenLine size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-midnight">
                {!currentUserId
                  ? "Bought from this seller? Share your experience."
                  : eligibleOrders.length > 0
                  ? `You can review ${eligibleOrders.length} completed ${
                      eligibleOrders.length === 1 ? "order" : "orders"
                    } from this seller`
                  : "Only verified buyers of this seller can leave a review"}
              </p>
              <p className="text-xs text-slate-light mt-0.5">
                {!currentUserId
                  ? "Sign in to leave a verified-buyer review."
                  : eligibleOrders.length > 0
                  ? "Help others shop with confidence — your review is anonymous to the public."
                  : "Complete a purchase from this seller to unlock reviews."}
              </p>
            </div>
          </div>
          <Button
            variant={eligibleOrders.length > 0 || !currentUserId ? "primary" : "outline"}
            size="md"
            onClick={openReviewModal}
            disabled={!!currentUserId && eligibleOrders.length === 0}
            className="shrink-0"
          >
            <PenLine size={14} className="mr-1.5" aria-hidden="true" />
            {!currentUserId ? "Sign in to review" : "Write a review"}
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b border-mist scrollbar-none">
          {REVIEW_FILTERS.map((f) => {
            const count =
              f.key === "five_star"   ? reviewCounts.five_star :
              f.key === "with_photos" ? reviewCounts.with_photos :
              reviewCounts.total;
            return (
              <button
                key={f.key}
                onClick={() => setReviewFilter(f.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                  reviewFilter === f.key
                    ? "border-violet bg-violet text-white"
                    : "border-mist bg-white text-slate hover:border-violet/40"
                }`}
                aria-pressed={reviewFilter === f.key}
              >
                {f.label} {f.key !== "recommended" && f.key !== "recent" ? `(${count})` : ""}
              </button>
            );
          })}
        </div>

        {filteredReviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist py-12 text-center bg-white">
            <Star className="mx-auto text-mist-dark mb-2" size={28} aria-hidden="true" />
            <p className="text-sm font-medium text-midnight">No reviews match this filter</p>
            <p className="text-xs text-slate-light mt-1">Try a different filter above.</p>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {visibleReviews.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-mist bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-teal text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {r.buyer?.full_name?.charAt(0) || "B"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-midnight truncate">
                        {r.buyer?.full_name || "Verified buyer"}
                      </p>
                      <p className="text-[11px] text-slate-light">{formatDate(r.created_at)}</p>
                    </div>
                  </div>
                  <span className="flex items-center shrink-0">{renderStars(r.rating, 12)}</span>
                </div>
                {r.comment && (
                  <p className="text-sm text-slate leading-relaxed">{r.comment}</p>
                )}
                {r.has_media && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-violet">
                    <Camera size={11} aria-hidden="true" />
                    Includes photos
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {filteredReviews.length > 4 && !showAllReviews && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="md" onClick={() => setShowAllReviews(true)}>
              Show all {filteredReviews.length} reviews
            </Button>
          </div>
        )}
      </section>

      {/* ===== Review submission modal ===== */}
      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-midnight/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={closeReviewModal}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-mist px-5 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h3
                  id="review-modal-title"
                  className="text-base font-bold text-midnight font-[family-name:var(--font-sora)]"
                >
                  Write a review
                </h3>
                <p className="text-xs text-slate-light truncate">
                  {product.sellers?.business_name || "this seller"}
                </p>
              </div>
              <button
                onClick={closeReviewModal}
                disabled={submittingReview}
                className="p-2 rounded-md text-slate hover:bg-cloud min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              {reviewSuccess ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald/10 text-emerald flex items-center justify-center mb-3">
                    <CheckCircle2 size={28} aria-hidden="true" />
                  </div>
                  <p className="text-base font-semibold text-midnight">Review posted</p>
                  <p className="text-sm text-slate-light mt-1">
                    Thanks for helping other buyers shop with confidence.
                  </p>
                </div>
              ) : (
                <>
                  {/* Order picker (only if multiple eligible) */}
                  {eligibleOrders.length > 1 && (
                    <div>
                      <label
                        htmlFor="review-order-select"
                        className="mb-1.5 block text-sm font-medium text-slate"
                      >
                        Which order are you reviewing?
                      </label>
                      <select
                        id="review-order-select"
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full rounded-[--radius-md] border border-mist-dark bg-white px-3 py-2.5 text-sm text-slate focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/20"
                      >
                        {eligibleOrders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.order_number} · {formatDate(o.created_at)} ·{" "}
                            {formatNaira(o.total / 100)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Star picker */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate">
                      Your rating
                    </label>
                    <div
                      className="flex items-center gap-1"
                      onMouseLeave={() => setReviewHoverRating(0)}
                      role="radiogroup"
                      aria-label="Rating"
                    >
                      {[1, 2, 3, 4, 5].map((n) => {
                        const active = (reviewHoverRating || reviewRating) >= n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setReviewRating(n)}
                            onMouseEnter={() => setReviewHoverRating(n)}
                            className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-gold/5 transition-colors"
                            aria-label={`${n} star${n === 1 ? "" : "s"}`}
                            aria-pressed={reviewRating === n}
                            role="radio"
                            aria-checked={reviewRating === n}
                          >
                            <Star
                              size={28}
                              className={
                                active
                                  ? "fill-gold text-gold"
                                  : "fill-mist text-mist-dark"
                              }
                              aria-hidden="true"
                            />
                          </button>
                        );
                      })}
                      {reviewRating > 0 && (
                        <span className="ml-2 text-sm font-semibold text-midnight">
                          {
                            ["", "Poor", "Fair", "Good", "Very good", "Excellent"][
                              reviewRating
                            ]
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Comment */}
                  <Textarea
                    id="review-comment"
                    label="Your review (optional)"
                    placeholder="What was great? What could be better? Mention quality, packaging, delivery time."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    maxLength={1000}
                    rows={5}
                  />
                  <p className="text-[11px] text-slate-light -mt-3 text-right">
                    {reviewComment.length}/1000
                  </p>

                  {reviewError && (
                    <div className="rounded-md bg-error/8 border border-error/20 px-3 py-2 text-sm text-error">
                      {reviewError}
                    </div>
                  )}

                  <div className="rounded-md bg-cloud border border-mist px-3 py-2 text-[11px] text-slate-light flex items-start gap-1.5">
                    <ShieldCheck size={12} className="text-emerald shrink-0 mt-0.5" aria-hidden="true" />
                    Your review is tied to a verified order. Reviews can&apos;t be edited once posted.
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            {!reviewSuccess && (
              <div className="sticky bottom-0 bg-white border-t border-mist px-5 py-3 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={closeReviewModal}
                  disabled={submittingReview}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  loading={submittingReview}
                  disabled={reviewRating === 0 || !selectedOrderId}
                  onClick={submitReview}
                >
                  Post review
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Sticky mobile CTA bar ===== */}
      <div className="lg:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 bg-white border-t border-mist shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            onClick={() => setWishlisted(!wishlisted)}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-md ${
              wishlisted ? "text-error" : "text-slate"
            }`}
            aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart size={18} className={wishlisted ? "fill-current" : ""} aria-hidden="true" />
            <span className="text-[10px] mt-0.5">Save</span>
          </button>
          <button
            onClick={contactSeller}
            disabled={!product.sellers?.id}
            className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-slate"
            aria-label="Message seller"
          >
            <MessageSquare size={18} aria-hidden="true" />
            <span className="text-[10px] mt-0.5">Chat</span>
          </button>
          <Button
            variant="outline"
            size="md"
            className="flex-1 whitespace-nowrap"
            loading={addingToCart}
            disabled={buyingNow || product.stock_quantity === 0}
            onClick={() => handleAddToCart(false)}
          >
            <ShoppingCart size={16} className="mr-1.5" aria-hidden="true" />
            Add to cart
          </Button>
          <Button
            variant="gold"
            size="md"
            className="flex-1 whitespace-nowrap"
            loading={buyingNow}
            disabled={addingToCart || product.stock_quantity === 0}
            onClick={() => handleAddToCart(true)}
          >
            Buy now
          </Button>
        </div>
      </div>
    </div>
  );
}

// -------------- small helpers --------------

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between px-4 py-2.5">
      <dt className="text-slate-light">{label}</dt>
      <dd className="text-midnight font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-midnight">{value}</p>
      <p className="text-[10px] text-slate-light">{label}</p>
    </div>
  );
}

function TrustChip({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md bg-cloud border border-mist">
      <Icon size={14} className="text-teal shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-[11px] font-semibold text-midnight leading-tight">{title}</p>
        <p className="text-[10px] text-slate-light leading-tight">{sub}</p>
      </div>
    </div>
  );
}

// ─── Data loaders ──────────────────────────────────────────────

// Loads the latest 50 reviews for a seller along with the reviewer's
// display name. Done as two queries instead of an inline join because
// the profiles table's RLS blocks one user from reading another's row —
// the public_profiles view (migration 012) is the safe display-only
// surface for cross-user name lookups.
type SupabaseClient = ReturnType<typeof createClient>;
async function loadSellerReviews(
  supabase: SupabaseClient,
  sellerId: string
): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, buyer_id, review_media(id)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(50);

  type RawReview = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    buyer_id: string;
    review_media?: Array<{ id: string }>;
  };
  const rows = (data as unknown as RawReview[] | null) ?? [];
  if (rows.length === 0) return [];

  const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id)));
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, full_name")
    .in("id", buyerIds);

  const nameById = Object.fromEntries(
    ((profiles as Array<{ id: string; full_name: string | null }> | null) ?? [])
      .map((p) => [p.id, p.full_name])
  );

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    buyer: { full_name: nameById[r.buyer_id] ?? "Verified buyer" },
    has_media: Array.isArray(r.review_media) ? r.review_media.length > 0 : false,
  }));
}
