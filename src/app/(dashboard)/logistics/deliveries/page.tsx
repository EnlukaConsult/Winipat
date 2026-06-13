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
  Phone,
} from "lucide-react";

type Delivery = {
  id: string;
  tracking_number: string;
  status: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  delivery_proof_url: string | null;
  order: {
    order_number: string;
    delivery_mode: string;
  } | null;
};

type Contact = { name: string; phone: string | null };

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"in_transit" | "delivered">("in_transit");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, Contact | "loading">>(
    {}
  );
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("shipments")
        .select(
          "id, tracking_number, status, picked_up_at, delivered_at, created_at, delivery_proof_url, order:orders(order_number, delivery_mode)"
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

  async function loadContact(shipmentId: string) {
    setContacts((prev) => ({ ...prev, [shipmentId]: "loading" }));
    const res = await fetch(
      `/api/logistics/contact?shipmentId=${shipmentId}&party=buyer`
    );
    if (!res.ok) {
      setContacts((prev) => ({
        ...prev,
        [shipmentId]: { name: "Unavailable", phone: null },
      }));
      return;
    }
    const body = (await res.json()) as Contact;
    setContacts((prev) => ({ ...prev, [shipmentId]: body }));
  }

  async function uploadProof(shipmentId: string, file: File) {
    setUploadingId(shipmentId);
    const ext = file.name.split(".").pop() || "jpg";
    // Store the storage PATH (not a public URL): the delivery-proofs bucket
    // is private, so proofs are viewed via short-lived signed URLs.
    const path = `${shipmentId}/delivery-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("delivery-proofs")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) {
      alert(`Couldn't upload proof: ${upErr.message}`);
      setUploadingId(null);
      return;
    }
    await supabase
      .from("shipments")
      .update({ delivery_proof_url: path })
      .eq("id", shipmentId);
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === shipmentId ? { ...d, delivery_proof_url: path } : d
      )
    );
    setUploadingId(null);
  }

  async function viewProof(path: string) {
    const { data } = await supabase.storage
      .from("delivery-proofs")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
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

                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {delivery.status === "in_transit" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadContact(delivery.id)}
                          loading={contacts[delivery.id] === "loading"}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                        <label
                          className={`inline-flex items-center justify-center rounded-[--radius-md] border border-mist-dark px-3 py-1.5 text-sm font-semibold text-slate cursor-pointer hover:bg-mist transition-colors ${
                            uploadingId === delivery.id
                              ? "opacity-60 pointer-events-none"
                              : ""
                          }`}
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          {uploadingId === delivery.id
                            ? "Uploading…"
                            : delivery.delivery_proof_url
                            ? "Replace Proof"
                            : "Upload Proof"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadProof(delivery.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
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

                  {contacts[delivery.id] &&
                    contacts[delivery.id] !== "loading" && (
                      <p className="text-xs text-slate-light">
                        {(contacts[delivery.id] as Contact).name}:{" "}
                        {(contacts[delivery.id] as Contact).phone ? (
                          <a
                            href={`tel:${(contacts[delivery.id] as Contact).phone}`}
                            className="font-semibold text-violet hover:underline"
                          >
                            {(contacts[delivery.id] as Contact).phone}
                          </a>
                        ) : (
                          "no phone on file"
                        )}
                      </p>
                    )}

                  {delivery.delivery_proof_url && (
                    <button
                      onClick={() => viewProof(delivery.delivery_proof_url!)}
                      className="text-xs text-emerald-dark hover:underline flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      View delivery proof
                    </button>
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
