"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BuyerHero } from "@/components/buyer/buyer-hero";
import { TrustBar } from "@/components/buyer/trust-bar";
import {
  OrderTracker,
  type TrackedOrder,
} from "@/components/buyer/order-tracker";
import { BuyerStats } from "@/components/buyer/buyer-stats";
import {
  ContinueBrowsing,
  type CategoryTile,
} from "@/components/buyer/continue-browsing";
import type { OrderStatus } from "@/lib/utils";

type BuyerHomeProps = {
  firstName: string;
};

// Active = anything between "payment_confirmed" and "in_transit" inclusive.
// Pending payment is technically the same buyer but it isn't really "in
// flight" yet — they need to finish paying. We surface those separately
// via the OrderTracker's exception state if any sneak through.
const ACTIVE_STATUSES: OrderStatus[] = [
  "payment_confirmed",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "delivered",
];

const COMPLETED_STATUSES: OrderStatus[] = ["completed"];

export function BuyerHome({ firstName }: BuyerHomeProps) {
  const [loadingPrimary, setLoadingPrimary] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(true);
  const [activeOrders, setActiveOrders] = useState<TrackedOrder[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrdersCount: 0,
    totalSpent: 0,
    reviewsLeft: 0,
  });
  const [categories, setCategories] = useState<CategoryTile[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ── Primary pass: orders + stats ──────────────────────────────────
      const [
        { data: allOrders },
        { count: reviewsLeft },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `id, order_number, total, status, created_at, seller_id,
             sellers!seller_id(business_name),
             order_items(product_name, product_id, products(product_media(file_url, display_order)))`
          )
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("buyer_id", user.id),
      ]);

      type RawOrder = {
        id: string;
        order_number: string;
        total: number;
        status: OrderStatus;
        created_at: string;
        seller_id: string;
        sellers?: { business_name: string } | { business_name: string }[];
        order_items?: Array<{
          product_name: string;
          product_id: string | null;
          products?:
            | { product_media?: Array<{ file_url: string; display_order: number }> }
            | { product_media?: Array<{ file_url: string; display_order: number }> }[];
        }>;
      };

      const rows = (allOrders as unknown as RawOrder[] | null) ?? [];

      // Totals across all-time
      const totalOrders = rows.length;
      const totalSpent = rows
        .filter((o) => COMPLETED_STATUSES.includes(o.status))
        .reduce((sum, o) => sum + (o.total ?? 0), 0);

      // Active orders (capped at 3 for the tracker widget; count is separate)
      const activeRows = rows
        .filter((o) => ACTIVE_STATUSES.includes(o.status))
        .slice(0, 3);

      const tracked: TrackedOrder[] = activeRows.map((o) => {
        const seller = Array.isArray(o.sellers) ? o.sellers[0] : o.sellers;
        const items = o.order_items ?? [];
        const firstItem = items[0];
        const product = firstItem?.products
          ? Array.isArray(firstItem.products)
            ? firstItem.products[0]
            : firstItem.products
          : null;
        const media = (product?.product_media ?? [])
          .slice()
          .sort(
            (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
          );
        return {
          id: o.id,
          order_number: o.order_number,
          total: o.total,
          status: o.status,
          created_at: o.created_at,
          seller_name: seller?.business_name ?? "Seller",
          item_count: items.length,
          first_item_name: firstItem?.product_name ?? "Order",
          thumbnail: media[0]?.file_url ?? null,
        };
      });

      const activeOrdersCount = rows.filter((o) =>
        ACTIVE_STATUSES.includes(o.status)
      ).length;

      setActiveOrders(tracked);
      setStats({
        totalOrders,
        activeOrdersCount,
        totalSpent,
        reviewsLeft: reviewsLeft ?? 0,
      });
      setLoadingPrimary(false);

      // ── Secondary pass: top categories for "Continue browsing" ────────
      //
      // Pull top 6 categories by active-product count. Done as a single
      // grouped query via products(category_id) — Supabase doesn't
      // support GROUP BY in the JS SDK directly, so we fetch a slice and
      // group client-side. 200 rows is plenty to rank by.
      const { data: catalogue } = await supabase
        .from("products")
        .select(
          `category_id, categories(id, name, slug),
           product_media(file_url, display_order)`
        )
        .eq("status", "active")
        .limit(200);

      type Raw = {
        category_id: string | null;
        categories?: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[];
        product_media?: Array<{ file_url: string; display_order: number }>;
      };
      const byCategory = new Map<string, CategoryTile>();
      (catalogue as unknown as Raw[] | null)?.forEach((row) => {
        const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        if (!cat?.id) return;
        const media = (row.product_media ?? [])
          .slice()
          .sort(
            (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
          );
        const existing = byCategory.get(cat.id) ?? {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          productCount: 0,
          thumbnail: null,
        };
        existing.productCount += 1;
        existing.thumbnail ??= media[0]?.file_url ?? null;
        byCategory.set(cat.id, existing);
      });

      const top = [...byCategory.values()]
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 6);
      setCategories(top);
      setLoadingDiscover(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <BuyerHero
        firstName={firstName}
        activeOrders={stats.activeOrdersCount}
      />

      <TrustBar />

      <OrderTracker orders={activeOrders} loading={loadingPrimary} />

      <BuyerStats
        totalOrders={stats.totalOrders}
        activeOrders={stats.activeOrdersCount}
        totalSpent={stats.totalSpent}
        reviewsLeft={stats.reviewsLeft}
        loading={loadingPrimary}
      />

      <ContinueBrowsing categories={categories} loading={loadingDiscover} />
    </div>
  );
}
