"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  MapPin,
  Package,
  Phone,
  CheckCircle2,
  Clock,
  Camera,
} from "lucide-react";

type Shipment = {
  id: string;
  tracking_number: string;
  status: string;
  created_at: string;
  order: {
    order_number: string;
    seller: { business_name: string };
  } | null;
};

export default function PickupsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("shipments")
        .select(
          "id, tracking_number, status, created_at, order:orders(order_number, seller:sellers(business_name))"
        )
        .in("status", ["assigned", "picked_up"])
        .order("created_at", { ascending: false });

      setShipments((data as Shipment[] | null) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function confirmPickup(id: string) {
    await supabase
      .from("shipments")
      .update({ status: "picked_up", picked_up_at: new Date().toISOString() })
      .eq("id", id);
    setShipments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "picked_up" } : s))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-royal border-t-transparent rounded-full" />
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Package className="h-16 w-16 text-mist-dark mb-4" />
        <h2 className="text-xl font-semibold text-midnight font-[family-name:var(--font-sora)] mb-2">
          No pending pickups
        </h2>
        <p className="text-slate-light">
          New pickup assignments will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="royal">{shipments.length} Assigned</Badge>
        <Badge variant="success">
          {shipments.filter((s) => s.status === "picked_up").length} Picked Up
        </Badge>
      </div>

      {shipments.map((shipment) => (
        <Card key={shipment.id} className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>
                  {shipment.order?.order_number || "N/A"}
                </CardTitle>
                <Badge
                  variant={
                    shipment.status === "assigned" ? "warning" : "success"
                  }
                >
                  {shipment.status === "assigned"
                    ? "Awaiting Pickup"
                    : "Picked Up"}
                </Badge>
              </div>
              <p className="text-sm text-slate-light">
                Tracking: {shipment.tracking_number}
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-light">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {shipment.order?.seller?.business_name || "Seller"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(shipment.created_at)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {shipment.status === "assigned" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {}}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => confirmPickup(shipment.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Confirm Pickup
                  </Button>
                </>
              )}
              {shipment.status === "picked_up" && (
                <Button variant="gold" size="sm" onClick={() => {}}>
                  <Camera className="h-4 w-4 mr-1" />
                  Upload Proof
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
