"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatNaira } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Users,
  UserCheck,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  MessageSquareWarning,
  Package,
  ArrowRight,
  Banknote,
  Sliders,
  Wallet,
  Clock,
} from "lucide-react";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Stats = {
  totalProducts: number;
  totalSellers: number;
  totalBuyers: number;
  totalOrders: number;
  pendingKyc: number;
  openDisputes: number;
  pendingPayouts: number;
  gmvKobo: number;          // sum of orders.total for completed orders
  escrowHeldKobo: number;   // sum of escrow_ledger.amount for held/captured/release_eligible
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0, totalSellers: 0, totalBuyers: 0, totalOrders: 0,
    pendingKyc: 0, openDisputes: 0, pendingPayouts: 0,
    gmvKobo: 0, escrowHeldKobo: 0,
  });

  const [recentProducts, setRecentProducts] = useState<
    { id: string; name: string; status: string; created_at: string; sellers: { business_name: string } | null }[]
  >([]);
  const [recentUsers, setRecentUsers] = useState<
    { id: string; full_name: string; role: string; email: string; created_at: string }[]
  >([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [
        productsRes, sellersRes, buyersRes, ordersRes,
        kycRes, disputesRes, payoutsRes,
        gmvRes, escrowRes,
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
        supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
        supabase.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("total").eq("status", "completed"),
        supabase.from("escrow_ledger").select("amount").in("status", ["held", "captured", "release_eligible"]),
      ]);

      const gmvKobo = (gmvRes.data || []).reduce((s, r) => s + (r.total || 0), 0);
      const escrowHeldKobo = (escrowRes.data || []).reduce((s, r) => s + (r.amount || 0), 0);

      setStats({
        totalProducts: productsRes.count || 0,
        totalSellers:  sellersRes.count  || 0,
        totalBuyers:   buyersRes.count   || 0,
        totalOrders:   ordersRes.count   || 0,
        pendingKyc:    kycRes.count      || 0,
        openDisputes:  disputesRes.count || 0,
        pendingPayouts: payoutsRes.count || 0,
        gmvKobo,
        escrowHeldKobo,
      });

      const { data: products } = await supabase
        .from("products")
        .select("id, name, status, created_at, sellers(business_name)")
        .order("created_at", { ascending: false })
        .limit(6);
      setRecentProducts((products as unknown as typeof recentProducts) || []);

      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, role, email, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      setRecentUsers(users || []);

      setLoading(false);
    }
    load();
  }, []);

  const kpis = [
    {
      label: "GMV (completed)",
      value: formatNaira(stats.gmvKobo / 100),
      icon: <Banknote className="h-5 w-5" />,
      bg: "bg-gradient-to-br from-violet to-violet-dark",
    },
    {
      label: "Escrow held",
      value: formatNaira(stats.escrowHeldKobo / 100),
      icon: <Wallet className="h-5 w-5" />,
      bg: "bg-gradient-to-br from-teal to-teal-dark",
    },
    {
      label: "Total orders",
      value: stats.totalOrders.toLocaleString(),
      icon: <ShoppingBag className="h-5 w-5" />,
      bg: "bg-gradient-to-br from-royal to-royal-dark",
    },
    {
      label: "Active sellers",
      value: stats.totalSellers.toLocaleString(),
      icon: <Users className="h-5 w-5" />,
      bg: "bg-gradient-to-br from-gold-dark to-gold",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===== WELCOME BANNER ===== */}
      <div className="relative rounded-[--radius-xl] overflow-hidden bg-gradient-to-r from-midnight via-violet-dark to-teal p-6 sm:p-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-teal/15 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-gold" />
              </div>
              <Badge variant="gold" className="text-xs">Admin Dashboard</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-sora)]">
              Welcome to Winipat Admin
            </h1>
            <p className="text-white/60 mt-1 text-sm sm:text-base">
              Manage sellers, products, disputes, and settlements across the platform.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="gold" size="sm" onClick={() => router.push("/admin/sellers")}>
              <UserCheck size={14} className="mr-1" />
              Review Sellers
            </Button>
            <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" onClick={() => router.push("/admin/disputes")}>
              <AlertTriangle size={14} className="mr-1" />
              Disputes
            </Button>
          </div>
        </div>
      </div>

      {/* ===== KPI CARDS (real data, no fake trends) ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={cn("rounded-[--radius-lg] p-5 text-white", kpi.bg)}>
            <div className="w-10 h-10 rounded-[--radius-md] bg-white/15 flex items-center justify-center mb-3">
              {kpi.icon}
            </div>
            <p className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-sora)]">
              {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-white/20" /> : kpi.value}
            </p>
            <p className="text-sm text-white/70 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ===== ACTION REQUIRED ===== */}
      {(stats.pendingKyc > 0 || stats.openDisputes > 0 || stats.pendingPayouts > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.pendingKyc > 0 && (
            <Card className="border-violet/30 bg-violet/5" padding="sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5 text-violet" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-midnight">
                      {stats.pendingKyc} Sellers pending KYC
                    </p>
                    <p className="text-xs text-slate-light">Awaiting verification</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/sellers")}>
                  Review <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </Card>
          )}
          {stats.openDisputes > 0 && (
            <Card className="border-error/30 bg-error/5" padding="sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                    <MessageSquareWarning className="h-5 w-5 text-error" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-midnight">
                      {stats.openDisputes} Open disputes
                    </p>
                    <p className="text-xs text-slate-light">Need a decision</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/disputes")}>
                  Review <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </Card>
          )}
          {stats.pendingPayouts > 0 && (
            <Card className="border-warn/30 bg-warn/5" padding="sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-warn/20 flex items-center justify-center shrink-0">
                    <Banknote className="h-5 w-5 text-warn" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-midnight">
                      {stats.pendingPayouts} Pending payouts
                    </p>
                    <p className="text-xs text-slate-light">Need bank transfer</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/payouts")}>
                  Process <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== RECENT PRODUCTS ===== */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2">
              <Package size={18} className="text-violet" />
              Recent Products
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/sellers")}>
              View all <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-mist rounded-[--radius-md] animate-pulse" />
              ))}
            </div>
          ) : recentProducts.length === 0 ? (
            <p className="text-sm text-slate-light py-4 text-center">No products yet</p>
          ) : (
            <div className="space-y-2">
              {recentProducts.map((p) => {
                const seller = Array.isArray(p.sellers) ? p.sellers[0] : p.sellers;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-[--radius-md] bg-cloud px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-midnight truncate">{p.name}</p>
                      <p className="text-xs text-slate-light">
                        {seller?.business_name || "Unknown"} · {timeAgo(p.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={p.status === "active" ? "success" : p.status === "paused" ? "warning" : p.status === "draft" ? "default" : "error"}
                      className="text-[10px] shrink-0 ml-2"
                    >
                      {p.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ===== RECENT USERS ===== */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2">
              <Users size={18} className="text-teal" />
              Recent Signups
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/analytics")}>
              Analytics <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-mist rounded-[--radius-md] animate-pulse" />
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="text-sm text-slate-light py-4 text-center">No users yet</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-[--radius-md] bg-cloud px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                      u.role === "admin" ? "bg-gradient-to-br from-violet to-teal" :
                      u.role === "seller" ? "bg-gradient-to-br from-royal to-violet" :
                      "bg-gradient-to-br from-teal to-emerald"
                    )}>
                      {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-midnight truncate">{u.full_name || "Unknown"}</p>
                      <p className="text-xs text-slate-light truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge
                      variant={u.role === "admin" ? "royal" : u.role === "seller" ? "gold" : "default"}
                      className="text-[10px] capitalize"
                    >
                      {u.role}
                    </Badge>
                    <span className="text-[10px] text-slate-lighter">{timeAgo(u.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Manage Sellers",  icon: UserCheck,           color: "from-violet to-violet-dark", href: "/admin/sellers"     },
          { label: "Review Disputes", icon: MessageSquareWarning, color: "from-error to-red-700",     href: "/admin/disputes"    },
          { label: "Process Payouts", icon: Banknote,            color: "from-teal to-teal-dark",    href: "/admin/payouts"     },
          { label: "Platform Settings", icon: Sliders,           color: "from-royal to-royal-dark",  href: "/admin/settings"    },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className={cn(
              "rounded-[--radius-lg] bg-gradient-to-br p-5 text-white text-left hover:shadow-lg transition-shadow cursor-pointer",
              action.color
            )}
          >
            <action.icon className="h-8 w-8 mb-3 opacity-80" />
            <p className="text-sm font-semibold">{action.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
