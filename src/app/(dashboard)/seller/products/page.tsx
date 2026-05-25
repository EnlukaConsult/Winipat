"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils";
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  ImageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  status: "active" | "draft" | "paused" | "removed";
  product_media: { file_url: string; display_order: number }[] | null;
  categories: { name: string } | null;
}

type ProductStatus = Product["status"];

const statusConfig: Record<
  ProductStatus,
  { label: string; variant: "success" | "default" | "warning" | "error" }
> = {
  active:  { label: "Active",  variant: "success" },
  draft:   { label: "Draft",   variant: "default" },
  paused:  { label: "Paused",  variant: "warning" },
  removed: { label: "Removed", variant: "error"   },
};

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchProducts() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Schema: products has no thumbnail_url and no category column. Pull the
    // first product_media row by display_order for the thumbnail and join
    // categories(name) for the label.
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
      const rows = (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        categories: Array.isArray(r.categories) ? r.categories[0] ?? null : r.categories,
      })) as Product[];
      setProducts(rows);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function toggleStatus(product: Product) {
    setActionLoading(product.id);
    const supabase = createClient();
    const newStatus: ProductStatus =
      product.status === "active" ? "paused" : "active";

    const { error: updateError } = await supabase
      .from("products")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (!updateError) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
    }
    setActionLoading(null);
  }

  async function deleteProduct(id: string) {
    if (
      !confirm(
        "Are you sure you want to delete this product? This cannot be undone."
      )
    )
      return;
    setActionLoading(id);
    const supabase = createClient();
    // Delete media first to avoid orphan rows; products row has ON DELETE
    // CASCADE on its children but storage objects need cleanup separately.
    await supabase.from("product_media").delete().eq("product_id", id);
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    if (!deleteError) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    setActionLoading(null);
  }

  function thumbnail(p: Product): string | null {
    if (!p.product_media || p.product_media.length === 0) return null;
    const sorted = [...p.product_media].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
    return sorted[0]?.file_url ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            My Products
          </h1>
          <p className="text-slate-light mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""} in your store
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-2" />
            Add New Product
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[--radius-md] bg-error/8 border border-error/30 px-4 py-3">
          <AlertCircle size={16} className="text-error shrink-0" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-[--radius-lg] border border-mist bg-white overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-mist" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-mist rounded w-3/4" />
                <div className="h-3 bg-mist rounded w-1/3" />
                <div className="h-8 bg-mist rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-mist p-5 mb-4">
            <Package size={36} className="text-slate-lighter" />
          </div>
          <h3 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-midnight">
            No products yet
          </h3>
          <p className="text-slate-light mt-2 max-w-sm">
            Add your first product to start selling. It only takes a few minutes.
          </p>
          <Link href="/seller/products/new" className="mt-5">
            <Button variant="primary">
              <Plus size={16} className="mr-2" />
              Add New Product
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const config = statusConfig[product.status];
            const isLoading = actionLoading === product.id;
            const thumb = thumbnail(product);

            return (
              <div
                key={product.id}
                className="rounded-[--radius-lg] border border-mist bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="relative aspect-square bg-cloud overflow-hidden">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon size={32} className="text-mist-dark" />
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-midnight text-sm leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    {product.categories?.name && (
                      <p className="text-xs text-slate-lighter mt-0.5">
                        {product.categories.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-sora)] font-bold text-midnight">
                      {formatNaira(product.price / 100)}
                    </span>
                    <span className="text-xs text-slate-light">
                      {product.stock_quantity} in stock
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/seller/products/${product.id}/edit`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Pencil size={13} className="mr-1.5" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading || product.status === "draft"}
                      onClick={() => toggleStatus(product)}
                      title={
                        product.status === "active"
                          ? "Pause product"
                          : "Activate product"
                      }
                    >
                      {isLoading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : product.status === "active" ? (
                        <PauseCircle size={15} className="text-amber-600" />
                      ) : (
                        <PlayCircle size={15} className="text-emerald" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => deleteProduct(product.id)}
                      title="Delete product"
                    >
                      {isLoading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} className="text-error" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
