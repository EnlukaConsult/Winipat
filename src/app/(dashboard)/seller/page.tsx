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

interface SellerProfile {
  business_name: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
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
  const [userName, setUserName] = useState("Seller");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: seller }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase
          .from("sellers")
          .select("business_name, verification_status, avg_rating")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (profile) setUserName(profile.full_name || "Seller");
      if (seller) {
        setSellerProfile({
          business_name: seller.business_name,
          verification_status: seller.verification_status,
        });
        setStats((prev) => ({ ...prev, avgRating: seller.avg_rating || 0 }));
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
            .eq("status", "paid"),
          supabase
            .from("orders")
            .select("id, order_number, created_at, total_amount, status, buyer_id")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const { data: salesData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("seller_id", user.id)
        .in("status", ["completed", "delivered"]);

      const totalSales = salesData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) ?? 0;

      setStats({
        totalSales,
        activeProducts: activeProducts || 0,
        pendingOrders: pendingOrders || 0,
        avgRating: seller?.avg_rating || 0,
      });

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
            total_amount: o.total_amount,
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
      {/* Verification Banner */}
      {sellerProfile && sellerProfile.verification_status !== "verified" && (
        <div
          className={`rounded-[--radius-lg] border px-5 py-4 flex items-start gap-3 ${
            sellerProfile.verification_status === "pending"
              ? "bg-warning/8 border-warning/30"
              : sellerProfile.verification_status === "rejected"
              ? "bg-error/8 border-error/30"
              : "bg-royal/8 border-royal/30"
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 shrink-0 ${
              sellerProfile.verification_status === "pending"
                ? "text-amber-600"
                : sellerProfile.verification_status === "rejected"
                ? "text-error"
                : "text-royal"
            }`}
            size={18}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-midnight">
              {sellerProfile.verification_status === "pending"
                ? "Verification under review"
                : sellerProfile.verification_status === "rejected"
                ? "Verification rejected"
                : "Complete your seller setup"}
            </p>
            <p className="text-sm text-slate-light mt-0.5">
              {sellerProfile.verification_status === "pending"
                ? "We're reviewing your documents. This usually takes 1–2 business days."
                : sellerProfile.verification_status === "rejected"
                ? "Your documents were not accepted. Please resubmit with valid information."
                : "Finish onboarding to start selling and receiving payouts."}
            </p>
          </div>
          {sellerProfile.verification_status !== "pending" && (
            <Link href="/seller/onboarding">
              <Button size="sm" variant="outline">
                {sellerProfile.verification_status === "rejected" ? "Resubmit" : "Complete Setup"}
                <ChevronRight size={14} className="ml-1" />
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Welcome back, {firstName} 👋
          </h1>
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
