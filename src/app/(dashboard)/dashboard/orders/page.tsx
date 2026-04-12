"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNaira, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/utils";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";

type Order = {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  total_amount: number;
  items: Array<{
    product: { name: string };
  }>;
  seller: {
    full_name: string;
  };
};

type TabFilter = "all" | "active" | "completed" | "disputed";

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "seller_preparing",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
];

const COMPLETED_STATUSES: OrderStatus[] = ["delivered", "completed", "refunded"];
const DISPUTED_STATUSES: OrderStatus[] = ["dispute_opened", "cancelled"];

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "disputed", label: "Disputed" },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("orders")
      .select(
        `id, order_number, created_at, status, total_amount,
         seller:profiles!seller_id(full_name),
         items:order_items(product:products(name))`
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    setOrders((data as unknown as Order[]) || []);
    setLoading(false);
  }

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return ACTIVE_STATUSES.includes(order.status);
    if (activeTab === "completed") return COMPLETED_STATUSES.includes(order.status);
    if (activeTab === "disputed") return DISPUTED_STATUSES.includes(order.status);
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          My Orders
        </h1>
        <p className="mt-0.5 text-sm text-slate-light">
          Track and manage all your purchases
        </p>
      </div>

      {/* Tab filters */}
      <div className="flex gap-1 rounded-[--radius-lg] border border-mist bg-white p-1 w-fit">
        {TABS.map(({ key, label }) => {
          const count =
            key === "all"
              ? orders.length
              : orders.filter((o) => {
                  if (key === "active") return ACTIVE_STATUSES.includes(o.status);
                  if (key === "completed") return COMPLETED_STATUSES.includes(o.status);
                  if (key === "disputed") return DISPUTED_STATUSES.includes(o.status);
                  return false;
                }).length;

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-[--radius-md] px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? "bg-royal text-white shadow-sm"
                  : "text-slate hover:text-royal"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    activeTab === key ? "bg-white/20 text-white" : "bg-mist text-slate"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[--radius-lg] border border-mist bg-white"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShoppingBag size={48} className="mb-4 text-mist-dark" />
          <h3 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-midnight">
            No orders found
          </h3>
          <p className="mt-1 text-sm text-slate-light">
            {activeTab === "all"
              ? "You haven't placed any orders yet"
              : `No ${activeTab} orders at the moment`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              hover
              padding="md"
              onClick={() => router.push(`/dashboard/orders/${order.id}`)}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[--radius-md] bg-royal/10">
                  <Package size={20} className="text-royal" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-midnight truncate">
                        Order #{order.order_number}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-light truncate">
                        {order.seller?.full_name} •{" "}
                        {order.items?.length ?? 0} item
                        {(order.items?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-slate-lighter">
                      {formatDate(order.created_at)}
                    </span>
                    <span className="font-bold text-royal">
                      {formatNaira(order.total_amount)}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} className="flex-shrink-0 text-slate-lighter" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
