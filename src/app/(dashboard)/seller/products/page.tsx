"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Package,
  AlertCircle,
  Search,
  Upload,
} from "lucide-react";
import {
  SellerProductCard,
  type SellerProductCardData,
  type ProductStatus,
} from "@/components/seller/product-card";

type Product = SellerProductCardData;

const STATUS_FILTERS: Array<{
  key: ProductStatus | "all" | "low";
  label: string;
}> = [
  { key: "all",     label: "All" },
  { key: "active",  label: "Active" },
  { key: "draft",   label: "Drafts" },
  { key: "paused",  label: "Paused" },
  { key: "low",     label: "Low / out of stock" },
];

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");

  async function fetchProducts() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        `id, name, price, stock_quantity, status,
         product_media(file_url, display_order),
         categories(name)`
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(`Failed to load products: ${fetchError.message}`);
    } else {
      type Raw = {
        id: string;
        name: string;
        price: number;
        stock_quantity: number;
        status: ProductStatus;
        product_media?: Array<{ file_url: string; display_order: number }>;
        categories?: { name: string } | Array<{ name: string }>;
      };
      const rows: Product[] = (data as unknown as Raw[] | null ?? []).map(
        (r) => {
          const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
          const media = (r.product_media ?? [])
            .slice()
            .sort(
              (a, b) =>
                (a.display_order ?? 0) - (b.display_order ?? 0)
            );
          return {
            id: r.id,
            name: r.name,
            price: r.price,
            stock_quantity: r.stock_quantity,
            status: r.status,
            thumbnail: media[0]?.file_url ?? null,
            categoryName: cat?.name ?? null,
          };
        }
      );
      setProducts(rows);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function toggleStatus(p: Product) {
    setBusyId(p.id);
    const supabase = createClient();
    const newStatus: ProductStatus = p.status === "active" ? "paused" : "active";
    const { error: updateError } = await supabase
      .from("products")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (!updateError) {
      setProducts((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, status: newStatus } : row))
      );
    }
    setBusyId(null);
  }

  async function deleteProduct(p: Product) {
    if (
      !confirm(
        `Delete "${p.name}"? This cannot be undone — any current orders for it will keep their snapshot details.`
      )
    )
      return;
    setBusyId(p.id);
    const supabase = createClient();
    await supabase.from("product_media").delete().eq("product_id", p.id);
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", p.id);
    if (!deleteError) {
      setProducts((prev) => prev.filter((row) => row.id !== p.id));
    }
    setBusyId(null);
  }

  // Per-status counts for the filter chips
  const counts = useMemo(() => {
    return {
      all:    products.length,
      active: products.filter((p) => p.status === "active").length,
      draft:  products.filter((p) => p.status === "draft").length,
      paused: products.filter((p) => p.status === "paused").length,
      low:    products.filter((p) => p.stock_quantity <= 5).length,
      removed: products.filter((p) => p.status === "removed").length,
    };
  }, [products]);

  // Apply filter + search
  const visible = useMemo(() => {
    let rows = products;
    if (filter === "low") {
      rows = rows.filter((p) => p.stock_quantity <= 5);
    } else if (filter !== "all") {
      rows = rows.filter((p) => p.status === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.categoryName?.toLowerCase().includes(q) ?? false)
      );
    }
    return rows;
  }, [products, filter, search]);

  // Active-products gross stock value (handy little stat in the header)
  const activeStockValue = useMemo(() => {
    return products
      .filter((p) => p.status === "active")
      .reduce((sum, p) => sum + (p.price * p.stock_quantity) / 100, 0);
  }, [products]);

  return (
    <div className="space-y-5">
      {/* ===== Header (richer than before, includes stock-value hint) ===== */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            My Products
          </h1>
          <p className="text-slate-light mt-1 text-sm">
            {products.length === 0
              ? "Your storefront is empty — add your first listing to get started."
              : `${products.length} product${products.length === 1 ? "" : "s"} · ${counts.active} live`}
            {activeStockValue > 0 && (
              <>
                {" · "}
                <span className="text-midnight font-semibold">
                  ₦{activeStockValue.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
                </span>{" "}
                stock value
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/seller/products/bulk">
            <Button variant="outline" size="sm">
              <Upload size={14} className="mr-1.5" />
              Bulk upload
            </Button>
          </Link>
          <Link href="/seller/products/new">
            <Button variant="primary" size="sm">
              <Plus size={14} className="mr-1.5" />
              Add product
            </Button>
          </Link>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-error/8 border border-error/30 px-4 py-3">
          <AlertCircle size={16} className="text-error shrink-0" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* ===== Filter + search toolbar ===== */}
      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filter chips — scroll horizontally on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {STATUS_FILTERS.map((f) => {
              const count = counts[f.key as keyof typeof counts];
              const isActive = filter === f.key;
              if (f.key !== "all" && count === 0) return null;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors min-h-[36px] ${
                    isActive
                      ? "bg-violet text-white"
                      : "bg-white text-slate-light border border-mist hover:border-violet/40 hover:text-violet"
                  }`}
                  aria-pressed={isActive}
                >
                  {f.label}
                  <span
                    className={`text-[10px] font-bold ${
                      isActive ? "text-white/80" : "text-slate-lighter"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-lighter pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category"
              className="w-full h-9 pl-9 pr-3 rounded-full border border-mist bg-white text-sm placeholder:text-slate-lighter focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/20"
            />
          </div>
        </div>
      )}

      {/* ===== Grid / loading / empty states ===== */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-mist bg-white overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-mist" />
              <div className="p-3.5 space-y-2.5">
                <div className="h-4 bg-mist rounded w-3/4" />
                <div className="h-3 bg-mist rounded w-1/3" />
                <div className="h-9 bg-mist rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyAllProducts />
      ) : visible.length === 0 ? (
        <EmptyFilter
          filter={filter}
          search={search}
          onClear={() => {
            setFilter("all");
            setSearch("");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((p) => (
            <SellerProductCard
              key={p.id}
              product={p}
              busy={busyId === p.id}
              onToggleStatus={toggleStatus}
              onDelete={deleteProduct}
              publicHref={`/dashboard/product/${p.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Empty-state components ─────────

function EmptyAllProducts() {
  return (
    <Card className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet/10 to-teal/10 text-violet mb-4"
      >
        <Package size={28} aria-hidden="true" />
      </div>
      <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-midnight">
        Your storefront is empty
      </h2>
      <p className="text-sm text-slate-light mt-2 max-w-sm">
        Add your first product to start selling. Most sellers see their first
        order within{" "}
        <strong className="text-midnight">7–10 days</strong> of going live.
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
        <Link href="/seller/products/new">
          <Button variant="primary">
            <Plus size={15} className="mr-1.5" />
            Add your first product
          </Button>
        </Link>
        <Link href="/seller/products/bulk">
          <Button variant="outline">
            <Upload size={15} className="mr-1.5" />
            Or bulk upload a CSV
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function EmptyFilter({
  filter,
  search,
  onClear,
}: {
  filter: string;
  search: string;
  onClear: () => void;
}) {
  const reason = search
    ? `matching "${search}"`
    : filter === "low"
    ? "with low or no stock"
    : `with status "${filter}"`;
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-mist/60 text-slate-light mb-3">
        <Search size={20} aria-hidden="true" />
      </div>
      <p className="font-bold text-midnight">No products {reason}</p>
      <p className="text-sm text-slate-light mt-1">
        Try a different filter or clear the search.
      </p>
      <button
        onClick={onClear}
        className="mt-4 text-sm font-bold text-violet hover:underline"
      >
        Clear filters
      </button>
    </Card>
  );
}
