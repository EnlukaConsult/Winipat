"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNaira, formatDate, type OrderStatus } from "@/lib/utils";
import {
  ShoppingBag,
  Package,
  Clock,
  Star,
  Plus,
  ListOrdered,
  Wallet,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface SellerStats {
  totalSales: number;
  activeProducts: number;
  pendingOrders: number;
  avgRating: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: OrderStatus;
  buyer_name: string;
}

type SellerStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | null;
type SellerBadge = "verified" | "trusted_seller" | "fast_dispatch";

interface SellerProfile {
  business_name: string | null;
  status: SellerStatus;
}

interface TrustScore {
  averageRating: number;
  totalReviews:  number;
  disputeRate:   number;   // 0..1
  onTimeRate:    number;   // 0..1
  badge:         SellerBadge | null;
}

export default function SellerDashboardPage() {
  const [stats, setStats] = useState<SellerStats>({
    totalSales: 0,
    activeProducts: 0,
    pendingOrders: 0,
    avgRating: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [userName, setUserName] = useState("Seller");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: seller }, { data: trust }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase
          .from("sellers")
          .select("business_name, status")
          .eq("id", user.id)
          .maybeSingle(),
        // Schema is trust_scores.seller_id + average_rating (not user_id + avg_rating)
        supabase
          .from("trust_scores")
          .select("average_rating, total_reviews, dispute_rate, on_time_rate, badge")
          .eq("seller_id", user.id)
          .maybeSingle(),
      ]);

      if (profile) setUserName(profile.full_name || "Seller");
      if (seller) {
        setSellerProfile({
          business_name: seller.business_name,
          status: seller.status,
        });
      } else {
        setSellerProfile({ business_name: null, status: null });
      }
      if (trust) {
        setStats((prev) => ({ ...prev, avgRating: Number(trust.average_rating) || 0 }));
        setTrustScore({
          averageRating: Number(trust.average_rating) || 0,
          totalReviews:  Number(trust.total_reviews) || 0,
          disputeRate:   Number(trust.dispute_rate) || 0,
          onTimeRate:    Number(trust.on_time_rate) || 0,
          badge:         (trust.badge as SellerBadge | null) ?? null,
        });
      }

      const [{ count: activeProducts }, { count: pendingOrders }, { data: orders }] =
        await Promise.all([
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("seller_id", user.id)
            .eq("status", "active"),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("seller_id", user.id)
            .in("status", ["payment_confirmed", "seller_preparing"]),
          supabase
            .from("orders")
            .select("id, order_number, created_at, total, status, buyer_id")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const { data: salesData } = await supabase
        .from("orders")
        .select("total")
        .eq("seller_id", user.id)
        .in("status", ["completed", "delivered"]);

      const totalSales = salesData?.reduce((sum, o) => sum + (o.total || 0), 0) ?? 0;

      setStats((prev) => ({
        ...prev,
        totalSales,
        activeProducts: activeProducts || 0,
        pendingOrders: pendingOrders || 0,
      }));

      if (orders && orders.length > 0) {
        const buyerIds = [...new Set(orders.map((o) => o.buyer_id))];
        const { data: buyers } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", buyerIds);

        const buyerMap = Object.fromEntries((buyers || []).map((b) => [b.id, b.full_name]));

        setRecentOrders(
          orders.map((o) => ({
            id: o.id,
            order_number: o.order_number,
            created_at: o.created_at,
            total_amount: o.total,
            status: o.status as OrderStatus,
            buyer_name: buyerMap[o.buyer_id]?.split(" ")[0] || "Customer",
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  const statsCards = [
    {
      label: "Total Sales",
      value: formatNaira(stats.totalSales),
      icon: TrendingUp,
      color: "text-emerald",
      bg: "bg-emerald/10",
    },
    {
      label: "Active Products",
      value: stats.activeProducts.toString(),
      icon: Package,
      color: "text-royal",
      bg: "bg-royal/10",
    },
    {
      label: "Pending Orders",
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-warning/10",
    },
    {
      label: "Average Rating",
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—",
      icon: Star,
      color: "text-gold-dark",
      bg: "bg-gold/20",
    },
  ];

  const quickActions = [
    { label: "Add Product", icon: Plus, href: "/seller/products/new", variant: "primary" as const },
    { label: "View Orders", icon: ListOrdered, href: "/seller/orders", variant: "outline" as const },
    { label: "Check Earnings", icon: Wallet, href: "/seller/earnings", variant: "outline" as const },
  ];

  const firstName = userName.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Verification Banner — covers all 5 seller_status states */}
      {sellerProfile && sellerProfile.status !== "approved" && (() => {
        const status = sellerProfile.status;
        const isPending = status === "submitted" || status === "under_review";
        const isRejected = status === "rejected";
        const isDraft = status === null || status === "draft";

        const bg = isPending ? "bg-warning/8 border-warning/30"
                 : isRejected ? "bg-error/8 border-error/30"
                 : "bg-royal/8 border-royal/30";
        const iconColor = isPending ? "text-amber-600"
                         : isRejected ? "text-error"
                         : "text-royal";
        const title = isPending ? "Verification under review"
                    : isRejected ? "Verification rejected"
                    : "Complete your seller setup";
        const body = isPending
                      ? "We're reviewing your documents. This usually takes 1–2 business days."
                    : isRejected
                      ? "Your documents were not accepted. Open your application to view feedback and resubmit (1 appeal allowed)."
                    : "Finish onboarding to start selling and receiving payouts.";
        const ctaLabel = isDraft ? "Complete Setup" : isRejected ? "Resubmit" : null;

        return (
          <div className={`rounded-[--radius-lg] border px-5 py-4 flex items-start gap-3 ${bg}`}>
            <AlertTriangle className={`mt-0.5 shrink-0 ${iconColor}`} size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-midnight">{title}</p>
              <p className="text-sm text-slate-light mt-0.5">{body}</p>
            </div>
            {ctaLabel && (
              <Link href="/seller/onboarding">
                <Button size="sm" variant="outline">
                  {ctaLabel}
                  <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
            )}
          </div>
        );
      })()}

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
              Welcome back, {firstName} 👋
            </h1>
            {trustScore?.badge && <BadgePill badge={trustScore.badge} />}
          </div>
          <p className="text-slate-light mt-1">
            {sellerProfile?.business_name
              ? `${sellerProfile.business_name} · Seller Portal`
              : "Here's what's happening with your store today."}
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-light uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="mt-2 font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
                  {loading ? (
                    <span className="inline-block h-7 w-20 rounded bg-mist animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`rounded-[--radius-md] p-2.5 ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-[family-name:var(--font-sora)] text-base font-semibold text-midnight mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant={action.variant} size="sm">
                <action.icon size={15} className="mr-2" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Reputation — Trust score + badge progression */}
      <Card>
        <CardHeader className="mb-4">
          <CardTitle>Reputation</CardTitle>
          <CardDescription>
            Your performance metrics determine trust badges that boost buyer confidence.
          </CardDescription>
        </CardHeader>
        <ReputationGrid trust={trustScore} loading={loading} />
        <BadgeLadder current={trustScore?.badge ?? null} />
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between mb-4">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your last 5 incoming orders</CardDescription>
          </div>
          <Link href="/seller/orders">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </CardHeader>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-[--radius-md] bg-mist animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingBag size={40} className="text-mist-dark mb-3" />
            <p className="font-semibold text-midnight">No orders yet</p>
            <p className="text-sm text-slate-light mt-1">
              Orders placed for your products will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-mist">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-midnight truncate">
                    #{order.order_number}
                  </p>
                  <p className="text-xs text-slate-light mt-0.5">
                    {order.buyer_name} · {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-midnight">
                    {formatNaira(order.total_amount)}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reputation / trust badge helpers
// ─────────────────────────────────────────────────────────────

const BADGE_META: Record<SellerBadge, { label: string; emoji: string; color: string; bg: string }> = {
  verified:       { label: "Verified",        emoji: "✓",  color: "text-royal",   bg: "bg-royal/10" },
  trusted_seller: { label: "Trusted Seller",  emoji: "★",  color: "text-gold-dark", bg: "bg-gold/20" },
  fast_dispatch:  { label: "Fast Dispatch",   emoji: "⚡", color: "text-emerald", bg: "bg-emerald/10" },
};

function BadgePill({ badge }: { badge: SellerBadge }) {
  const meta = BADGE_META[badge];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[--radius-full] ${meta.bg} ${meta.color} px-2.5 py-1 text-xs font-semibold`}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function ReputationGrid({ trust, loading }: { trust: TrustScore | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-[--radius-md] bg-mist animate-pulse" />
        ))}
      </div>
    );
  }

  const t = trust ?? { averageRating: 0, totalReviews: 0, disputeRate: 0, onTimeRate: 0, badge: null };
  const metrics = [
    {
      label: "Avg rating",
      value: t.totalReviews > 0 ? `${t.averageRating.toFixed(1)} / 5` : "—",
      sub:   t.totalReviews > 0 ? `${t.totalReviews} review${t.totalReviews === 1 ? "" : "s"}` : "no reviews yet",
    },
    {
      label: "On-time rate",
      value: t.totalReviews > 0 ? `${Math.round(t.onTimeRate * 100)}%` : "—",
      sub:   "Orders dispatched on time",
    },
    {
      label: "Dispute rate",
      value: t.totalReviews > 0 ? `${(t.disputeRate * 100).toFixed(1)}%` : "—",
      sub:   "Lower is better",
    },
    {
      label: "Trust badge",
      value: t.badge ? BADGE_META[t.badge].label : "None yet",
      sub:   t.badge ? "Awarded by platform" : "Earn one below",
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-[--radius-md] border border-mist p-3">
          <p className="text-xs font-medium text-slate-light uppercase tracking-wide">{m.label}</p>
          <p className="mt-1 font-[family-name:var(--font-sora)] text-lg font-bold text-midnight">{m.value}</p>
          <p className="text-xs text-slate-lighter mt-0.5">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}

// Three-tier ladder showing badges in progression order.
// Earned ones are full-colour; unearned are greyed out.
function BadgeLadder({ current }: { current: SellerBadge | null }) {
  const tiers: Array<{ badge: SellerBadge; criteria: string }> = [
    { badge: "verified",       criteria: "Complete KYC verification" },
    { badge: "fast_dispatch",  criteria: "≥90% of orders marked Ready within 24h" },
    { badge: "trusted_seller", criteria: "≥25 completed orders + ≥4.5 rating + ≤2% dispute rate" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {tiers.map((tier) => {
        const earned = tier.badge === current;
        const meta = BADGE_META[tier.badge];
        return (
          <div
            key={tier.badge}
            className={`rounded-[--radius-md] border p-3 flex items-start gap-3 ${
              earned ? `${meta.bg} border-transparent` : "bg-cloud border-mist"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                earned ? `${meta.color} ${meta.bg}` : "text-slate-lighter bg-mist"
              }`}
            >
              {meta.emoji}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${earned ? meta.color : "text-midnight"}`}>
                {meta.label}
                {earned && <span className="ml-2 text-xs text-emerald">earned</span>}
              </p>
              <p className="text-xs text-slate-light mt-0.5">{tier.criteria}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
