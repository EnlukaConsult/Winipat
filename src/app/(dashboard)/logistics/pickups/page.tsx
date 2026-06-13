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
  pickup_proof_url: string | null;
  order: {
    order_number: string;
    seller: { business_name: string };
  } | null;
};

type Contact = { name: string; phone: string | null };

export default function PickupsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
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
          "id, tracking_number, status, created_at, pickup_proof_url, order:orders(order_number, seller:sellers(business_name))"
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

  async function loadContact(shipmentId: string) {
    setContacts((prev) => ({ ...prev, [shipmentId]: "loading" }));
    const res = await fetch(
      `/api/logistics/contact?shipmentId=${shipmentId}&party=seller`
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
    const path = `${shipmentId}/pickup-${Date.now()}.${ext}`;
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
      .update({ pickup_proof_url: path })
      .eq("id", shipmentId);
    setShipments((prev) =>
      prev.map((s) =>
        s.id === shipmentId ? { ...s, pickup_proof_url: path } : s
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

            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                {shipment.status === "assigned" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadContact(shipment.id)}
                      loading={contacts[shipment.id] === "loading"}
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
                  <label
                    className={`inline-flex items-center justify-center rounded-[--radius-md] bg-gold px-3 py-1.5 text-sm font-semibold text-midnight cursor-pointer hover:bg-gold-dark transition-colors ${
                      uploadingId === shipment.id
                        ? "opacity-60 pointer-events-none"
                        : ""
                    }`}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    {uploadingId === shipment.id
                      ? "Uploading…"
                      : shipment.pickup_proof_url
                      ? "Replace Proof"
                      : "Upload Proof"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadProof(shipment.id, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Revealed seller contact */}
              {contacts[shipment.id] && contacts[shipment.id] !== "loading" && (
                <p className="text-xs text-slate-light">
                  {(contacts[shipment.id] as Contact).name}:{" "}
                  {(contacts[shipment.id] as Contact).phone ? (
                    <a
                      href={`tel:${(contacts[shipment.id] as Contact).phone}`}
                      className="font-semibold text-violet hover:underline"
                    >
                      {(contacts[shipment.id] as Contact).phone}
                    </a>
                  ) : (
                    "no phone on file"
                  )}
                </p>
              )}

              {shipment.pickup_proof_url && (
                <button
                  onClick={() => viewProof(shipment.pickup_proof_url!)}
                  className="text-xs text-emerald-dark hover:underline flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  View pickup proof
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
