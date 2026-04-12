"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  Camera,
  Clock,
} from "lucide-react";

type Delivery = {
  id: string;
  tracking_number: string;
  status: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  order: {
    order_number: string;
    delivery_mode: string;
  } | null;
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"in_transit" | "delivered">("in_transit");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("shipments")
        .select(
          "id, tracking_number, status, picked_up_at, delivered_at, created_at, order:orders(order_number, delivery_mode)"
        )
        .in("status", ["in_transit", "delivered"])
        .order("created_at", { ascending: false });

      setDeliveries((data as Delivery[] | null) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function confirmDelivery(id: string) {
    await supabase
      .from("shipments")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", id);
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "delivered", delivered_at: new Date().toISOString() } : d))
    );
  }

  const filtered = deliveries.filter((d) => d.status === tab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-royal border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("in_transit")}
          className={`px-4 py-2 rounded-[--radius-full] text-sm font-medium transition-colors ${
            tab === "in_transit"
              ? "bg-royal text-white"
              : "bg-mist text-slate hover:bg-mist-dark"
          }`}
        >
          <Truck className="h-4 w-4 inline mr-1" />
          In Transit ({deliveries.filter((d) => d.status === "in_transit").length})
        </button>
        <button
          onClick={() => setTab("delivered")}
          className={`px-4 py-2 rounded-[--radius-full] text-sm font-medium transition-colors ${
            tab === "delivered"
              ? "bg-emerald text-white"
              : "bg-mist text-slate hover:bg-mist-dark"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 inline mr-1" />
          Delivered ({deliveries.filter((d) => d.status === "delivered").length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Package className="h-12 w-12 text-mist-dark mb-3" />
          <p className="text-slate-light">
            No {tab === "in_transit" ? "deliveries in transit" : "completed deliveries"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((delivery) => (
            <Card key={delivery.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle>{delivery.order?.order_number || "N/A"}</CardTitle>
                    <Badge variant={delivery.status === "in_transit" ? "info" : "success"}>
                      {delivery.status === "in_transit" ? "In Transit" : "Delivered"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-light">
                    Tracking: {delivery.tracking_number}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-light">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {delivery.order?.delivery_mode === "door_to_door"
                        ? "Door-to-Door"
                        : "Pickup Office"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {delivery.picked_up_at
                        ? formatDate(delivery.picked_up_at)
                        : formatDate(delivery.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {delivery.status === "in_transit" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => {}}>
                        <Camera className="h-4 w-4 mr-1" />
                        Upload Proof
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => confirmDelivery(delivery.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Confirm Delivery
                      </Button>
                    </>
                  )}
                  {delivery.status === "delivered" && delivery.delivered_at && (
                    <span className="text-sm text-emerald flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {formatDate(delivery.delivered_at)}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
