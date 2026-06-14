"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { getProductImage } from "@/lib/product-images";
import {
  Search,
  Package,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Sparkles,
  ArrowDownNarrowWide,
  Truck,
  Flame,
} from "lucide-react";

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
  sellers: { business_name: string; status: string } | null;
  product_media: { file_url: string }[] | null;
};

const CATEGORIES = [
  { label: "All",         slug: "all" },
  { label: "Fashion",     slug: "fashion-accessories" },
  { label: "Shoes",       slug: "shoes" },
  { label: "Jewelry",     slug: "jewelry" },
  { label: "Watches",     slug: "watches-accessories" },
  { label: "Beauty",      slug: "health-beauty" },
  { label: "Electronics", slug: "electronics" },
  { label: "Home",        slug: "home-living" },
];

type SortKey = "recommended" | "newest" | "price_low" | "price_high";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: "recommended", label: "Recommended", icon: Sparkles },
  { key: "newest",      label: "New in",      icon: TrendingUp },
  { key: "price_low",   label: "Price ↑",     icon: ArrowDownNarrowWide },
  { key: "price_high",  label: "Price ↓",     icon: ArrowDownNarrowWide },
];

const PRICE_BANDS: Array<{
  key: "any" | "under-10k" | "10k-50k" | "50k-200k" | "over-200k";
  label: string;
}> = [
  { key: "any",        label: "Any price" },
  { key: "under-10k",  label: "Under ₦10k" },
  { key: "10k-50k",    label: "₦10k–50k" },
  { key: "50k-200k",   label: "₦50k–200k" },
  { key: "over-200k",  label: "₦200k+" },
];

export default function BrowsePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [categoryIds, setCategoryIds] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<Set<string>>(new Set());
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [priceBand, setPriceBand] = useState<"any" | "under-10k" | "10k-50k" | "50k-200k" | "over-200k">("any");
  const [cartBusy, setCartBusy] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase.from("categories").select("id, slug");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((c) => {
          map[c.slug] = c.id;
        });
        setCategoryIds(map);
      }
    }
    loadCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("products")
      .select(
        "id, name, slug, price, description, stock_quantity, units_sold, created_at, categories(name, slug), sellers(business_name, status), product_media(file_url)"
      )
      .eq("status", "active");

    if (activeCategory !== "all" && categoryIds[activeCategory]) {
      query = query.eq("category_id", categoryIds[activeCategory]);
    }

    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    // Sorting
    if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sort === "price_low") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_high") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data } = await query.limit(48);
    setProducts((data as unknown as Product[]) || []);
    setLoading(false);
  }, [search, activeCategory, categoryIds, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Hydrate the cart Set from the real backend on mount so the visual
  // "in cart" state matches what the server thinks. Without this, the
  // page would lose the icon highlight on refresh and the user couldn't
  // tell what they'd already added.
  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        const ids = new Set<string>(
          (data.items ?? []).map(
            (i: { product_id: string }) => i.product_id
          )
        );
        setCart(ids);
      })
      .catch(() => {
        // Not authed yet or network blip — leave the set empty
      });
  }, []);

  // Actually add to cart server-side. Toggling off (removing) is left
  // to the cart page itself — this button is purely a one-tap "add" so
  // we don't lose a sale by misinterpreting a second tap as removal.
  async function addToCart(productId: string) {
    if (cart.has(productId)) {
      // Already in cart — go straight there instead of re-adding
      router.push("/dashboard/cart");
      return;
    }
    setCartBusy(productId);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/dashboard/browse`);
        return;
      }
      if (res.ok) {
        setCart((prev) => {
          const next = new Set(prev);
          next.add(productId);
          return next;
        });
      }
    } finally {
      setCartBusy(null);
    }
  }

  // Client-side filter applied after the SQL query (sellers + price filters
  // are easier to evaluate here without complicating the query).
  const visibleProducts = products.filter((p) => {
    if (verifiedOnly && p.sellers?.status !== "approved") return false;
    if (priceBand !== "any") {
      const naira = p.price / 100;
      if (priceBand === "under-10k"  && naira >= 10_000) return false;
      if (priceBand === "10k-50k"    && (naira < 10_000 || naira >= 50_000)) return false;
      if (priceBand === "50k-200k"   && (naira < 50_000 || naira >= 200_000)) return false;
      if (priceBand === "over-200k"  && naira < 200_000) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* ===== Big search bar (Temu-style centered) ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-2xl">
          <Input
            placeholder="Search Winipat for anything…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
            className="text-base"
            aria-label="Search products"
          />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-light">
          <ShieldCheck size={14} className="text-emerald" />
          KYC-verified sellers · Escrow on every order
        </div>
      </div>

      {/* ===== Category strip ===== */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all min-h-[36px] ${
              activeCategory === cat.slug
                ? "bg-violet text-white shadow-md"
                : "bg-white border border-mist-dark text-slate hover:border-violet hover:text-violet"
            }`}
            aria-pressed={activeCategory === cat.slug}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ===== Filter chips row (price + verified) ===== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {PRICE_BANDS.map((band) => {
          const active = priceBand === band.key;
          return (
            <button
              key={band.key}
              onClick={() => setPriceBand(band.key)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors min-h-[34px] ${
                active
                  ? "bg-midnight text-white"
                  : "bg-white border border-mist text-slate-light hover:border-violet/40 hover:text-violet"
              }`}
              aria-pressed={active}
            >
              {band.label}
            </button>
          );
        })}
        <button
          onClick={() => setVerifiedOnly((v) => !v)}
          className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors min-h-[34px] ${
            verifiedOnly
              ? "bg-emerald text-white"
              : "bg-white border border-mist text-slate-light hover:border-emerald/40 hover:text-emerald-dark"
          }`}
          aria-pressed={verifiedOnly}
        >
          <ShieldCheck size={12} aria-hidden="true" />
          Verified sellers only
        </button>
      </div>

      {/* ===== Sort tabs ===== */}
      <div className="flex items-center justify-between gap-3 border-b border-mist pb-2">
        <div
          className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Sort"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              role="tab"
              aria-selected={sort === opt.key}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                sort === opt.key
                  ? "border-violet text-violet"
                  : "border-transparent text-slate-light hover:text-midnight"
              }`}
            >
              <opt.icon size={14} aria-hidden="true" />
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-lighter shrink-0 hidden sm:inline">
          {loading
            ? "Loading…"
            : `${visibleProducts.length}${visibleProducts.length !== products.length ? ` of ${products.length}` : ""} products`}
        </span>
      </div>

      {/* ===== Product grid ===== */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-mist bg-white overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-mist" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-mist rounded-full w-3/4" />
                <div className="h-4 bg-mist rounded-full w-1/2" />
                <div className="h-3 bg-mist rounded-full w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package size={48} className="mb-4 text-mist-dark" />
          <h3 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-midnight">
            {products.length === 0 ? "No products found" : "No products match your filters"}
          </h3>
          <p className="mt-1 text-sm text-slate-light max-w-sm">
            {products.length === 0
              ? "Try a different search term or category."
              : "Try a different price band, turn off the verified-only filter, or pick another category."}
          </p>
          {products.length > 0 && (
            <button
              onClick={() => {
                setPriceBand("any");
                setVerifiedOnly(false);
              }}
              className="mt-4 text-sm font-bold text-violet hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleProducts.map((product, i) => {
            // Real metrics only (Bug 4) — no fabricated rating/review counts.
            const sold        = product.units_sold ?? 0;
            const isVerified  = product.sellers?.status === "approved";
            const isHot       = i < 3; // First 3 in current sort = "trending"

            return (
              <article
                key={product.id}
                className="group relative rounded-xl border border-mist bg-white overflow-hidden hover:shadow-lg hover:border-violet/30 transition-all duration-200 cursor-pointer flex flex-col"
                onClick={() => router.push(`/dashboard/product/${product.id}`)}
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-cloud">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.product_media?.[0]?.file_url || getProductImage(product.slug, product.categories?.slug)}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Top-left stack of badges */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1.5 items-start">
                    {isHot && (
                      <Badge variant="error" className="text-[10px] px-1.5 py-0.5 shadow-sm flex items-center gap-0.5">
                        <Flame size={9} aria-hidden="true" />
                        Trending
                      </Badge>
                    )}
                  </div>

                  {/* Cart button — top right. Single tap adds; if already
                      in cart, a second tap navigates to /dashboard/cart
                      (we never silently delete on tap — too easy to
                      misfire and lose an intended purchase). */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product.id);
                    }}
                    disabled={cartBusy === product.id}
                    className={`absolute right-2 top-2 rounded-full p-2 shadow-md transition-all min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-60 ${
                      cart.has(product.id)
                        ? "bg-violet text-white"
                        : "bg-white/95 text-slate hover:bg-violet hover:text-white"
                    }`}
                    aria-label={cart.has(product.id) ? "Go to cart" : "Add to cart"}
                    title={cart.has(product.id) ? "Already in cart — tap to view" : "Add to cart"}
                  >
                    <ShoppingCart size={14} aria-hidden="true" />
                  </button>

                  {/* Bottom-left "Verified seller" pill */}
                  {isVerified && (
                    <div className="absolute left-2 bottom-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-emerald-dark shadow-sm">
                        <ShieldCheck size={10} aria-hidden="true" />
                        Verified
                      </span>
                    </div>
                  )}

                  {/* Low-stock corner ribbon */}
                  {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                    <div className="absolute right-2 bottom-2">
                      <span className="inline-block rounded-full bg-error/95 text-white px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                        {product.stock_quantity} left
                      </span>
                    </div>
                  )}
                  {product.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-midnight/60 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">Sold out</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col gap-1">
                  <p className="line-clamp-2 text-[13px] sm:text-sm font-medium text-midnight leading-snug min-h-[2.5rem]">
                    {product.name}
                  </p>

                  {/* Price + sold count */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-midnight">
                      {formatNaira(product.price / 100)}
                    </span>
                  </div>

                  {/* Sold count — real, shown only when there are sales */}
                  {sold > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-light">
                      <span>{sold.toLocaleString()} sold</span>
                    </div>
                  )}

                  {/* Seller line */}
                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-light mt-1">
                    <span className="truncate">
                      {product.sellers?.business_name || "Seller"}
                    </span>
                    <span className="flex items-center gap-0.5 text-emerald shrink-0">
                      <Truck size={10} aria-hidden="true" />
                      Ships nationwide
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Floating cart shortcut on mobile */}
      {cart.size > 0 && (
        <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push("/dashboard/cart")}
            className="shadow-2xl whitespace-nowrap"
          >
            <ShoppingCart size={16} className="mr-2" />
            {cart.size} item{cart.size !== 1 ? "s" : ""} · Go to cart
          </Button>
        </div>
      )}
    </div>
  );
}
