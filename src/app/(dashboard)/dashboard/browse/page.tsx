"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils";
import { getProductImage } from "@/lib/product-images";
import {
  Search,
  Package,
  Star,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  stock_quantity: number;
  categories: { name: string; slug: string } | null;
  sellers: { business_name: string; status: string } | null;
  product_media: { file_url: string }[] | null;
};

const CATEGORIES = [
  { label: "All", slug: "all" },
  { label: "Fashion", slug: "fashion-accessories" },
  { label: "Shoes", slug: "shoes" },
  { label: "Jewelry", slug: "jewelry" },
  { label: "Watches", slug: "watches-accessories" },
  { label: "Beauty", slug: "health-beauty" },
  { label: "Electronics", slug: "electronics" },
  { label: "Home", slug: "home-living" },
];

export default function BrowsePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [categoryIds, setCategoryIds] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<Set<string>>(new Set());

  const router = useRouter();

  // Load category IDs on mount
  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("id, slug");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((c) => { map[c.slug] = c.id; });
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
      .select("id, name, slug, price, description, stock_quantity, categories(name, slug), sellers(business_name, status), product_media(file_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Filter by category using category_id
    if (activeCategory !== "all" && categoryIds[activeCategory]) {
      query = query.eq("category_id", categoryIds[activeCategory]);
    }

    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    const { data } = await query.limit(48);
    setProducts((data as unknown as Product[]) || []);
    setLoading(false);
  }, [search, activeCategory, categoryIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const toggleCart = (productId: string) => {
    setCart((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={12}
        className={i < count ? "fill-gold text-gold" : "fill-mist text-mist-dark"}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search size={18} />}
        className="max-w-xl"
      />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className={`flex-shrink-0 rounded-[--radius-full] px-4 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeCategory === cat.slug
                ? "bg-royal text-white shadow-md"
                : "bg-white border border-mist-dark text-slate hover:border-royal hover:text-royal"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[--radius-lg] border border-mist bg-white overflow-hidden animate-pulse">
              <div className="h-48 bg-mist" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-mist rounded-full w-3/4" />
                <div className="h-3 bg-mist rounded-full w-1/2" />
                <div className="h-5 bg-mist rounded-full w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package size={48} className="mb-4 text-mist-dark" />
          <h3 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-midnight">
            No products found
          </h3>
          <p className="mt-1 text-sm text-slate-light">
            Try a different search term or category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="group rounded-[--radius-lg] border border-mist bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => router.push(`/dashboard/product/${product.id}`)}
            >
              {/* Product image */}
              <div className="relative h-48 overflow-hidden bg-cloud">
                <img
                  src={product.product_media?.[0]?.file_url || getProductImage(product.slug, product.categories?.slug)}
                  alt={product.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCart(product.id);
                  }}
                  className={`absolute right-2 top-2 rounded-full p-2 shadow-md transition-all duration-200 cursor-pointer ${
                    cart.has(product.id)
                      ? "bg-royal text-white"
                      : "bg-white/90 text-slate hover:bg-royal hover:text-white"
                  }`}
                  aria-label="Add to cart"
                >
                  <ShoppingCart size={16} />
                </button>
                {product.sellers?.status === "approved" && (
                  <div className="absolute left-2 top-2">
                    <Badge variant="success" className="text-[10px] px-2 py-0.5 bg-white/90 text-emerald-dark">
                      <ShieldCheck size={10} className="mr-0.5" />
                      Verified
                    </Badge>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-1.5">
                <p className="line-clamp-2 text-sm font-semibold text-midnight leading-snug">
                  {product.name}
                </p>

                <p className="text-lg font-bold text-violet">
                  {formatNaira(product.price / 100)}
                </p>

                <div className="flex items-center gap-0.5">
                  {renderStars(4)}
                  <span className="text-xs text-slate-lighter ml-1">(127)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-light truncate">
                    {product.sellers?.business_name || "Seller"}
                  </span>
                  {product.sellers?.status === "approved" && (
                    <ShieldCheck size={14} className="text-teal shrink-0" />
                  )}
                </div>

                {product.categories && (
                  <Badge variant="royal" className="text-[10px] px-2 py-0.5">
                    {product.categories.name}
                  </Badge>
                )}

                {product.stock_quantity <= 5 && (
                  <p className="text-xs text-error font-medium">
                    Only {product.stock_quantity} left!
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
