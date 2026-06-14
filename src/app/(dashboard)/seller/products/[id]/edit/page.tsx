"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

type Category = { id: string; name: string };

// Seller product edit page (Bug 7 — the card's "Edit" link pointed here but
// the route didn't exist). Loads the seller's own product, prefills, and
// PATCHes /api/seller/products. Media editing is intentionally out of scope
// here (managed at upload time); this covers the core editable fields and the
// draft -> submit-for-review transition.
export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const [{ data: product }, { data: cats }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, description, category_id, price, stock_quantity, status")
        .eq("id", productId)
        .eq("seller_id", user.id)
        .maybeSingle(),
      supabase.from("categories").select("id, name").order("name"),
    ]);

    setCategories((cats as Category[]) ?? []);

    if (!product) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setName(product.name ?? "");
    setDescription(product.description ?? "");
    setCategoryId(product.category_id ?? "");
    setPrice(product.price != null ? String(product.price / 100) : "");
    setStockQuantity(product.stock_quantity != null ? String(product.stock_quantity) : "");
    setStatus(product.status ?? "");
    setLoading(false);
  }, [productId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(submitForReview: boolean) {
    setError("");
    setSuccess("");

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stockQuantity, 10);
    if (!name.trim()) return setError("Product name is required.");
    if (!description.trim()) return setError("Description is required.");
    if (!categoryId) return setError("Please pick a category.");
    if (!priceNum || priceNum <= 0) return setError("Enter a valid price.");
    if (!Number.isInteger(stockNum) || stockNum < 0)
      return setError("Enter a valid stock quantity.");

    setSaving(true);
    const res = await fetch("/api/seller/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        name: name.trim(),
        description: description.trim(),
        categoryId,
        price: priceNum,
        stockQuantity: stockNum,
        ...(submitForReview ? { status: "paused" } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(body.error || "Couldn't save changes. Please try again.");
      return;
    }
    setSuccess(
      submitForReview ? "Submitted for review." : "Changes saved."
    );
    setTimeout(() => router.push("/seller/products"), 800);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 bg-mist rounded-full" />
        <div className="h-80 bg-mist rounded-[--radius-lg]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-lg font-semibold text-midnight">Product not found</p>
        <p className="mt-1 text-sm text-slate-light">
          It may have been deleted, or it isn&apos;t one of your products.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/seller/products")}
        >
          Back to My Products
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button
        onClick={() => router.push("/seller/products")}
        className="flex items-center gap-2 text-sm text-slate-light hover:text-midnight transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to My Products
      </button>

      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Edit Product
        </h1>
        {status === "draft" && (
          <p className="mt-0.5 text-sm text-slate-light">
            This product is a <strong>draft</strong> — submit it for review to
            go live.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-[--radius-md] bg-error/8 border border-error/20 px-3 py-2 text-sm text-error flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[--radius-md] bg-emerald/10 border border-emerald/30 px-3 py-2 text-sm text-emerald-dark flex items-start gap-2">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <Card padding="md">
        <CardTitle className="text-sm mb-4">Product details</CardTitle>
        <div className="space-y-4">
          <Input
            label="Product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            label="Description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-slate mb-1.5">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-[--radius-md] border border-mist bg-white px-3 py-2.5 text-sm text-midnight focus:border-violet focus:outline-none"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (₦)"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              label="Stock quantity"
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => save(false)}
            loading={saving}
          >
            Save changes
          </Button>
          {status === "draft" && (
            <Button
              variant="gold"
              onClick={() => save(true)}
              loading={saving}
            >
              Save &amp; submit for review
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
