"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNaira, formatDate, type OrderStatus } from "@/lib/utils";
import {
  ShoppingBag,
  CheckCircle2,
  PackageCheck,
  Camera,
  Timer,
  Loader2,
  AlertCircle,
  X,
  Upload,
} from "lucide-react";

const TAB_STATUSES: Record<string, OrderStatus[]> = {
  Pending: ["paid"],
  Preparing: ["seller_preparing"],
  Ready: ["awaiting_pickup"],
  Completed: ["delivered", "completed"],
};

const TABS = Object.keys(TAB_STATUSES);
const SLA_SECONDS = 15 * 60; // 15 minutes to accept

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: OrderStatus;
  buyer_name: string;
  items: OrderItem[];
}

function useCountdown(createdAt: string, enabled: boolean): string {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
      const rem = Math.max(0, SLA_SECONDS - elapsed);
      setRemaining(rem);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, enabled]);

  if (!enabled) return "";
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function SlaTimer({ createdAt }: { createdAt: string }) {
  const time = useCountdown(createdAt, true);
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
  const remaining = Math.max(0, SLA_SECONDS - elapsed);
  const isUrgent = remaining < 5 * 60;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isUrgent ? "text-error" : "text-amber-600"
      }`}
    >
      <Timer size={12} />
      {time || "Expired"}
    </span>
  );
}

interface PhotoUploadModalProps {
  orderId: string;
  onClose: () => void;
  onDone: (orderId: string) => void;
}

function PhotoUploadModal({ orderId, onClose, onDone }: PhotoUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `orders/${orderId}/package-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("order-photos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("order-photos").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          package_photo_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) throw updateError;
      onDone(orderId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-midnight/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[--radius-xl] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-[family-name:var(--font-sora)] font-semibold text-midnight">
            Upload Package Photo
          </h3>
          <button onClick={onClose} className="text-slate-lighter hover:text-slate transition-colors">
            <X size={20} />
          </button>
        </div>

        {preview ? (
          <div className="relative aspect-video rounded-[--radius-md] overflow-hidden mb-4">
            <img src={preview} alt="Package preview" className="h-full w-full object-cover" />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 rounded-full bg-midnight/70 text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-video rounded-[--radius-md] border-2 border-dashed border-mist-dark bg-cloud hover:border-royal hover:bg-royal/5 transition-colors flex flex-col items-center justify-center gap-2 mb-4 cursor-pointer"
          >
            <Camera size={28} className="text-slate-lighter" />
            <span className="text-sm font-medium text-slate">Tap to add photo</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {error && (
          <div className="mb-3 flex items-center gap-2 text-sm text-error">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" size="md" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            disabled={!file || uploading}
            loading={uploading}
            onClick={handleUpload}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onAction: (id: string, action: "accept" | "ready") => void;
  onPhoto: (id: string) => void;
  actionLoading: string | null;
}

function OrderCard({ order, onAction, onPhoto, actionLoading }: OrderCardProps) {
  const isLoading = actionLoading === order.id;
  const isPending = order.status === "paid";
  const isPreparing = order.status === "seller_preparing";
  const isReady = order.status === "awaiting_pickup";

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-midnight">#{order.order_number}</p>
            <StatusBadge status={order.status} />
            {isPending && <SlaTimer createdAt={order.created_at} />}
          </div>
          <p className="text-sm text-slate-light mt-0.5">
            {order.buyer_name} · {formatDate(order.created_at)}
          </p>
        </div>
        <p className="font-[family-name:var(--font-sora)] font-bold text-midnight shrink-0">
          {formatNaira(order.total_amount)}
        </p>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate">
              {item.product_name}{" "}
              <span className="text-slate-light">× {item.quantity}</span>
            </span>
            <span className="text-slate font-medium">{formatNaira(item.unit_price * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {isPending && (
          <Button
            variant="primary"
            size="sm"
            loading={isLoading}
            onClick={() => onAction(order.id, "accept")}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={14} className="mr-1.5" />
                Accept Order
              </>
            )}
          </Button>
        )}
        {isPreparing && (
          <>
            <Button
              variant="primary"
              size="sm"
              loading={isLoading}
              onClick={() => onAction(order.id, "ready")}
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <PackageCheck size={14} className="mr-1.5" />
                  Mark Ready for Pickup
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPhoto(order.id)}>
              <Camera size={14} className="mr-1.5" />
              Package Photo
            </Button>
          </>
        )}
        {isReady && (
          <Button variant="outline" size="sm" onClick={() => onPhoto(order.id)}>
            <Upload size={14} className="mr-1.5" />
            Update Package Photo
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function SellerOrdersPage() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [photoOrderId, setPhotoOrderId] = useState<string | null>(null);

  async function fetchOrders() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const statuses = Object.values(TAB_STATUSES).flat();
    const { data: rawOrders } = await supabase
      .from("orders")
      .select("id, order_number, created_at, total_amount, status, buyer_id, order_items")
      .eq("seller_id", user.id)
      .in("status", statuses)
      .order("created_at", { ascending: false });

    if (!rawOrders) { setLoading(false); return; }

    const buyerIds = [...new Set(rawOrders.map((o) => o.buyer_id))];
    const { data: buyers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", buyerIds);

    const buyerMap = Object.fromEntries((buyers || []).map((b) => [b.id, b.full_name]));

    setOrders(
      rawOrders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        created_at: o.created_at,
        total_amount: o.total_amount,
        status: o.status as OrderStatus,
        buyer_name: buyerMap[o.buyer_id]?.split(" ")[0] || "Customer",
        items: Array.isArray(o.order_items) ? o.order_items : [],
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  async function handleAction(id: string, action: "accept" | "ready") {
    setActionLoading(id);
    const supabase = createClient();
    const newStatus: OrderStatus = action === "accept" ? "seller_preparing" : "awaiting_pickup";
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
    }
    setActionLoading(null);
  }

  const tabOrders = orders.filter((o) => TAB_STATUSES[activeTab].includes(o.status));

  const tabCounts = TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab] = orders.filter((o) => TAB_STATUSES[tab].includes(o.status)).length;
    return acc;
  }, {});

  return (
    <>
      {photoOrderId && (
        <PhotoUploadModal
          orderId={photoOrderId}
          onClose={() => setPhotoOrderId(null)}
          onDone={() => {}}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Orders
          </h1>
          <p className="text-slate-light mt-1">Manage incoming and active orders</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-[--radius-lg] bg-mist p-1 w-full sm:w-auto sm:inline-flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none whitespace-nowrap rounded-[--radius-md] px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-white text-midnight shadow-sm"
                  : "text-slate-light hover:text-midnight"
              }`}
            >
              {tab}
              {tabCounts[tab] > 0 && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    activeTab === tab ? "bg-royal text-white" : "bg-mist-dark text-slate"
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-[--radius-lg] bg-mist animate-pulse" />
            ))}
          </div>
        ) : tabOrders.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag size={36} className="text-mist-dark mb-3" />
            <p className="font-semibold text-midnight">No {activeTab.toLowerCase()} orders</p>
            <p className="text-sm text-slate-light mt-1">
              {activeTab === "Pending"
                ? "New orders from buyers will appear here."
                : `Orders in the ${activeTab.toLowerCase()} stage will show here.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tabOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleAction}
                onPhoto={setPhotoOrderId}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
