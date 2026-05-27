"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNaira, formatDate, type OrderStatus } from "@/lib/utils";
import {
  ShoppingBag,
  Plus,
  ListOrdered,
  Wallet,
  ArrowRight,
  Building2,
  MapPin,
  FileText,
  Banknote,
} from "lucide-react";
import { SellerHero } from "@/components/seller/seller-hero";
import { OnboardingProgress } from "@/components/seller/onboarding-progress";
import { QuickStats } from "@/components/seller/quick-stats";
import { SellerHealth } from "@/components/seller/seller-health";
import { getSellerLevel, ALL_TIERS } from "@/components/seller/seller-level";

type SellerStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | null;

interface RecentOrder {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: OrderStatus;
  buyer_name: string;
}

interface SellerProfile {
  id: string | null;
  business_name: string | null;
  pickup_address: string | null;
  status: SellerStatus;
  admin_notes: string | null;
}

interface DashboardData {
  totalSales: number;
  completedOrders: number;
  totalOrders: number;
  activeProducts: number;
  pendingOrders: number;
  avgRating: number;
  totalReviews: number;
  disputeRate: number;
  onTimeRate: number;
}

const DEFAULT_DATA: DashboardData = {
  totalSales: 0,
  completedOrders: 0,
  totalOrders: 0,
  activeProducts: 0,
  pendingOrders: 0,
  avgRating: 0,
  totalReviews: 0,
  disputeRate: 0,
  onTimeRate: 0,
};

export default function SellerDashboardPage() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [userName, setUserName] = useState("Seller");
  // Tracked separately from sellers row so we can show the 4-step
  // onboarding meter accurately (KYC docs live in seller_kyc_documents,
  // bank in bank_accounts — neither is denormalised on sellers).
  const [hasKycDocs, setHasKycDocs] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: profile },
        { data: seller },
        { data: trust },
        { data: kycDocs },
        { data: bankAcc },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase
          .from("sellers")
          .select("id, business_name, pickup_address, status, admin_notes")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("trust_scores")
          .select("average_rating, total_reviews, dispute_rate, on_time_rate")
          .eq("seller_id", user.id)
          .maybeSingle(),
        supabase
          .from("seller_kyc_documents")
          .select("id")
          .eq("seller_id", user.id)
          .limit(1),
        supabase
          .from("bank_accounts")
          .select("id")
          .eq("seller_id", user.id)
          .limit(1),
      ]);

      if (profile) setUserName(profile.full_name || "Seller");
      if (seller) {
        setSellerProfile({
          id: seller.id,
          business_name: seller.business_name,
          pickup_address: seller.pickup_address,
          status: seller.status,
          admin_notes: seller.admin_notes,
        });
      } else {
        setSellerProfile({
          id: null,
          business_name: null,
          pickup_address: null,
          status: null,
          admin_notes: null,
        });
      }

      setHasKycDocs(!!kycDocs && kycDocs.length > 0);
      setHasBankAccount(!!bankAcc && bankAcc.length > 0);

      // Order/product counts in parallel
      const [
        { count: activeProducts },
        { count: pendingOrders },
        { count: totalOrders },
        { data: orders },
        { data: completedOrdersData },
      ] = await Promise.all([
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
          .select("*", { count: "exact", head: true })
          .eq("seller_id", user.id),
        supabase
          .from("orders")
          .select("id, order_number, created_at, total, status, buyer_id")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("orders")
          .select("total")
          .eq("seller_id", user.id)
          .in("status", ["completed", "delivered"]),
      ]);

      const totalSales =
        completedOrdersData?.reduce((sum, o) => sum + (o.total || 0), 0) ?? 0;

      setData({
        totalSales,
        completedOrders: completedOrdersData?.length ?? 0,
        totalOrders: totalOrders ?? 0,
        activeProducts: activeProducts ?? 0,
        pendingOrders: pendingOrders ?? 0,
        avgRating: Number(trust?.average_rating ?? 0),
        totalReviews: Number(trust?.total_reviews ?? 0),
        disputeRate: Number(trust?.dispute_rate ?? 0),
        onTimeRate: Number(trust?.on_time_rate ?? 0),
      });

      if (orders && orders.length > 0) {
        const buyerIds = [...new Set(orders.map((o) => o.buyer_id))];
        const { data: buyers } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", buyerIds);

        const buyerMap = Object.fromEntries(
          (buyers || []).map((b) => [b.id, b.full_name])
        );

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

  const firstName = userName.split(" ")[0];
  const isApproved = sellerProfile?.status === "approved";

  // Derive seller level
  const level = getSellerLevel({
    isApproved,
    completedOrders: data.completedOrders,
    averageRating: data.avgRating,
    disputeRate: data.disputeRate,
  });

  // Onboarding step completeness — derived from the actual DB state, not
  // the wizard's internal flags, so a half-completed wizard still shows
  // accurate progress.
  const onboardingSteps = [
    {
      id: 1 as const,
      label: "Business info",
      icon: Building2,
      done: !!sellerProfile?.business_name,
    },
    {
      id: 2 as const,
      label: "Pickup address",
      icon: MapPin,
      done: !!sellerProfile?.pickup_address,
    },
    {
      id: 3 as const,
      label: "KYC documents",
      icon: FileText,
      done: hasKycDocs,
    },
    {
      id: 4 as const,
      label: "Bank account",
      icon: Banknote,
      done: hasBankAccount,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===== Hero ===== */}
      <SellerHero
        firstName={firstName}
        businessName={sellerProfile?.business_name ?? null}
        sellerId={sellerProfile?.id ?? null}
        isApproved={isApproved}
        level={level}
      />

      {/* ===== Onboarding progress (hidden when approved) ===== */}
      <OnboardingProgress
        status={sellerProfile?.status ?? null}
        steps={onboardingSteps}
        rejectionReason={sellerProfile?.admin_notes}
      />

      {/* ===== KPI tiles with proper empty states ===== */}
      <QuickStats
        totalSales={data.totalSales}
        activeProducts={data.activeProducts}
        pendingOrders={data.pendingOrders}
        avgRating={data.avgRating}
        totalReviews={data.totalReviews}
        loading={loading}
      />

      {/* ===== Quick actions ===== */}
      <div>
        <h2 className="font-[family-name:var(--font-sora)] text-base font-semibold text-midnight mb-3">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/seller/products/new">
            <Button variant="primary" size="sm">
              <Plus size={15} className="mr-2" />
              Add product
            </Button>
          </Link>
          <Link href="/seller/orders">
            <Button variant="outline" size="sm">
              <ListOrdered size={15} className="mr-2" />
              View orders
            </Button>
          </Link>
          <Link href="/seller/earnings">
            <Button variant="outline" size="sm">
              <Wallet size={15} className="mr-2" />
              Earnings
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== Seller health + level ladder ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <SellerHealth
          isApproved={isApproved}
          totalOrders={data.totalOrders}
          completedOrders={data.completedOrders}
          onTimeRate={data.onTimeRate}
          disputeRate={data.disputeRate}
        />

        {/* Seller level ladder */}
        <article className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
          <header className="mb-4">
            <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
              Seller level ladder
            </h2>
            <p className="mt-0.5 text-sm text-slate-light">
              Climb tiers to unlock buyer-confidence boosts.
            </p>
          </header>
          <ol className="space-y-2" role="list">
            {ALL_TIERS.map((tier) => {
              const isCurrent = tier.tier === level.tier;
              const isAchieved = tier.tier <= level.tier;
              return (
                <li
                  key={tier.tier}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                    isCurrent
                      ? "border-violet/30 bg-violet/5"
                      : isAchieved
                      ? "border-emerald/20 bg-emerald/5"
                      : "border-mist bg-cloud/40"
                  }`}
                >
                  <span
                    className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-base ${
                      isCurrent
                        ? "bg-violet text-white"
                        : isAchieved
                        ? "bg-emerald/15 text-emerald-dark"
                        : "bg-mist text-slate-lighter"
                    }`}
                    aria-hidden="true"
                  >
                    {tier.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold leading-tight ${
                        isCurrent
                          ? "text-violet"
                          : isAchieved
                          ? "text-emerald-dark"
                          : "text-midnight"
                      }`}
                    >
                      Level {tier.tier} · {tier.label}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-violet">
                          You are here
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-light mt-0.5 leading-tight">
                      {tier.criteria}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </article>
      </div>

      {/* ===== Recent orders ===== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between mb-4">
          <div>
            <CardTitle>Recent orders</CardTitle>
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
              <div
                key={i}
                className="h-14 rounded-xl bg-mist animate-pulse"
              />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-mist/60 text-slate-light mb-3">
              <ShoppingBag size={22} />
            </div>
            <p className="font-bold text-midnight">No orders yet</p>
            <p className="text-sm text-slate-light mt-1 max-w-sm">
              Your first order will appear here the moment a buyer pays.
              Most new sellers see their first order within{" "}
              <strong className="text-midnight">7–10 days</strong> of going live.
            </p>
            <Link href="/seller/products/new" className="mt-4">
              <Button variant="primary" size="sm">
                <Plus size={14} className="mr-1.5" />
                Add your first product
              </Button>
            </Link>
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
                    {formatNaira(order.total_amount / 100)}
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
