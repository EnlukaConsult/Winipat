"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Package,
  User,
  ShoppingBag,
  MessageSquare,
  Image as ImageIcon,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  SplitSquareVertical,
} from "lucide-react";

type DisputeStatus = "open" | "under_review" | "resolved";
type DisputeReason =
  | "item_not_received"
  | "item_not_as_described"
  | "damaged_item"
  | "wrong_item"
  | "seller_no_response";

interface Dispute {
  id: string;
  orderNumber: string;
  buyer: { name: string; email: string };
  seller: { name: string; businessName: string };
  amount: number;
  reason: DisputeReason;
  openedDate: string;
  status: DisputeStatus;
  buyerMessage: string;
  sellerResponse: string;
  evidence: string[];
  adminNotes: string;
  resolution?: "released_to_seller" | "partial_refund" | "full_refund" | "return_required";
  partialAmount?: number;
}

const MOCK_DISPUTES: Dispute[] = [
  {
    id: "d1", orderNumber: "ORD-2841", amount: 28_500,
    buyer: { name: "Emeka Okafor", email: "emeka.o@mail.com" },
    seller: { name: "Adaeze Okonkwo", businessName: "Adaeze Crafts" },
    reason: "item_not_as_described", openedDate: "2026-04-10T09:22:00Z",
    status: "open",
    buyerMessage: "The handwoven bag I received is significantly different from the photos. The stitching is loose and the colour is wrong. I want a full refund.",
    sellerResponse: "",
    evidence: ["photo_bag_received.jpg", "photo_listing.jpg"],
    adminNotes: "",
  },
  {
    id: "d2", orderNumber: "ORD-2808", amount: 14_000,
    buyer: { name: "Ngozi Adeyemi", email: "ngozi.a@mail.com" },
    seller: { name: "Babatunde Folarin", businessName: "QuickDeals NG" },
    reason: "item_not_received", openedDate: "2026-04-05T14:10:00Z",
    status: "under_review",
    buyerMessage: "Order was marked delivered 5 days ago but I never received the package. Tracking shows it was dropped at wrong address.",
    sellerResponse: "The logistics company confirmed delivery at the registered address. We have photos. We are not liable for delivery errors.",
    evidence: ["tracking_screenshot.png"],
    adminNotes: "Awaiting logistics provider confirmation. Contacted rider #L-042.",
  },
  {
    id: "d3", orderNumber: "ORD-2795", amount: 52_000,
    buyer: { name: "Chinedu Ike", email: "chinedu.ike@mail.com" },
    seller: { name: "Obiora Chukwu", businessName: "Chukwu Electronics" },
    reason: "damaged_item", openedDate: "2026-03-28T11:00:00Z",
    status: "resolved",
    buyerMessage: "Laptop screen arrived cracked. Clearly damaged in transit. Requesting full refund or replacement.",
    sellerResponse: "Item was packaged securely with bubble wrap and hard case. Likely courier fault. We are willing to offer partial refund.",
    evidence: ["cracked_screen_1.jpg", "cracked_screen_2.jpg", "packaging_photo.jpg"],
    adminNotes: "Resolved: 70% refund agreed upon as item is still partially functional. Seller agreed.",
    resolution: "partial_refund",
    partialAmount: 36_400,
  },
  {
    id: "d4", orderNumber: "ORD-2831", amount: 9_800,
    buyer: { name: "Aisha Musa", email: "aisha.m@mail.com" },
    seller: { name: "Fatima Usman", businessName: "Abuja Pottery Co." },
    reason: "wrong_item", openedDate: "2026-04-09T16:45:00Z",
    status: "open",
    buyerMessage: "I ordered a ceramic bowl set but received a single mug. Completely wrong item.",
    sellerResponse: "We are investigating with our warehouse team. Should be resolved within 48 hours.",
    evidence: ["received_item.jpg", "order_invoice.pdf"],
    adminNotes: "",
  },
];

type Tab = "open" | "under_review" | "resolved";

const TAB_LABELS: Record<Tab, string> = {
  open: "Open",
  under_review: "Under Review",
  resolved: "Resolved",
};

const REASON_LABELS: Record<DisputeReason, string> = {
  item_not_received: "Item Not Received",
  item_not_as_described: "Not As Described",
  damaged_item: "Damaged Item",
  wrong_item: "Wrong Item",
  seller_no_response: "Seller No Response",
};

const STATUS_BADGE: Record<DisputeStatus, React.ReactElement> = {
  open: <Badge variant="error">Open</Badge>,
  under_review: <Badge variant="warning">Under Review</Badge>,
  resolved: <Badge variant="success">Resolved</Badge>,
};

const RESOLUTION_LABELS: Record<NonNullable<Dispute["resolution"]>, string> = {
  released_to_seller: "Released to Seller",
  partial_refund: "Partial Refund",
  full_refund: "Full Refund",
  return_required: "Return Required",
};

export default function AdminDisputesPage() {
  const [tab, setTab] = useState<Tab>("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>(MOCK_DISPUTES);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});

  const filtered = disputes.filter((d) => d.status === tab);

  const tabCounts: Record<Tab, number> = {
    open: disputes.filter((d) => d.status === "open").length,
    under_review: disputes.filter((d) => d.status === "under_review").length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
  };

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  function resolveDispute(id: string, resolution: NonNullable<Dispute["resolution"]>) {
    setDisputes((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const noteText = notes[id] || d.adminNotes;
        const partial = resolution === "partial_refund" ? parseFloat(partialAmounts[id] || "0") : undefined;
        return { ...d, status: "resolved" as DisputeStatus, resolution, adminNotes: noteText, partialAmount: partial };
      })
    );
    setExpanded(null);
  }

  function moveToReview(id: string) {
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "under_review" as DisputeStatus } : d))
    );
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Dispute Management
        </h1>
        <p className="mt-1 text-sm text-slate-light">
          Review buyer–seller disputes and issue resolutions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[--radius-md] bg-mist p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[--radius-sm] px-3 py-2 text-sm font-medium transition-all duration-200",
              tab === t
                ? "bg-white text-midnight shadow-sm"
                : "text-slate-light hover:text-slate"
            )}
          >
            {TAB_LABELS[t]}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-bold",
                tab === t ? "bg-royal/10 text-royal" : "bg-mist-dark text-slate-light"
              )}
            >
              {tabCounts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Dispute Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="rounded-[--radius-lg] py-12 text-center">
            <p className="text-slate-light">No {TAB_LABELS[tab].toLowerCase()} disputes.</p>
          </Card>
        ) : (
          filtered.map((dispute) => {
            const isOpen = expanded === dispute.id;
            return (
              <Card key={dispute.id} className="rounded-[--radius-lg] p-0 overflow-hidden">
                {/* Row header */}
                <button
                  className="w-full cursor-pointer px-6 py-4 text-left"
                  onClick={() => toggleExpand(dispute.id)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/10">
                        <AlertTriangle className="h-4 w-4 text-error" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-midnight">
                            #{dispute.orderNumber}
                          </span>
                          {STATUS_BADGE[dispute.status]}
                          <Badge variant="default">{REASON_LABELS[dispute.reason]}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-light">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {dispute.buyer.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {dispute.seller.businessName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {formatNaira(dispute.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-lighter">
                      <span>Opened {formatDate(dispute.openedDate)}</span>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="border-t border-mist bg-cloud px-6 py-5 space-y-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      {/* Buyer message */}
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold text-midnight">
                          <User className="h-4 w-4 text-royal" />
                          Buyer's Statement
                        </h4>
                        <div className="rounded-[--radius-md] border border-mist bg-white p-4 text-sm text-slate">
                          {dispute.buyerMessage}
                        </div>
                      </div>

                      {/* Seller response */}
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold text-midnight">
                          <ShoppingBag className="h-4 w-4 text-violet" />
                          Seller's Response
                        </h4>
                        <div className="rounded-[--radius-md] border border-mist bg-white p-4 text-sm text-slate">
                          {dispute.sellerResponse || (
                            <span className="italic text-slate-lighter">No response yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidence */}
                    {dispute.evidence.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold text-midnight">
                          <ImageIcon className="h-4 w-4 text-slate-light" />
                          Evidence Files
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {dispute.evidence.map((file) => (
                            <div
                              key={file}
                              className="flex items-center gap-2 rounded-[--radius-sm] border border-mist bg-white px-3 py-1.5 text-sm text-slate hover:bg-mist cursor-pointer"
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-royal" />
                              {file}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Notes */}
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 font-semibold text-midnight">
                        <MessageSquare className="h-4 w-4 text-slate-light" />
                        Admin Notes
                      </h4>
                      <Textarea
                        placeholder="Internal notes (not visible to buyer/seller)…"
                        value={notes[dispute.id] ?? dispute.adminNotes}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [dispute.id]: e.target.value }))
                        }
                        className="text-sm"
                      />
                    </div>

                    {/* Resolved badge */}
                    {dispute.status === "resolved" && dispute.resolution && (
                      <div className="rounded-[--radius-md] border border-emerald/30 bg-emerald/5 px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-dark">
                          Resolution: {RESOLUTION_LABELS[dispute.resolution]}
                          {dispute.resolution === "partial_refund" && dispute.partialAmount
                            ? ` — ${formatNaira(dispute.partialAmount)}`
                            : ""}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {dispute.status !== "resolved" && (
                      <div className="space-y-3">
                        {dispute.status === "open" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => moveToReview(dispute.id)}
                          >
                            Mark Under Review
                          </Button>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveDispute(dispute.id, "released_to_seller")}
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald" />
                            Release to Seller
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveDispute(dispute.id, "full_refund")}
                          >
                            <DollarSign className="mr-1.5 h-4 w-4 text-royal" />
                            Full Refund
                          </Button>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Partial amount (₦)"
                              value={partialAmounts[dispute.id] || ""}
                              onChange={(e) =>
                                setPartialAmounts((prev) => ({
                                  ...prev,
                                  [dispute.id]: e.target.value,
                                }))
                              }
                              className="w-36 rounded-[--radius-sm] border border-mist-dark px-3 py-2 text-sm text-slate focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveDispute(dispute.id, "partial_refund")}
                            >
                              <SplitSquareVertical className="mr-1.5 h-4 w-4 text-violet" />
                              Partial Refund
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resolveDispute(dispute.id, "return_required")}
                          >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Return Required
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
