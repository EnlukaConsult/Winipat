"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Ban,
  FileText,
  Building2,
  Phone,
  Mail,
  Calendar,
  Shield,
} from "lucide-react";

type SellerStatus = "pending" | "approved" | "suspended" | "rejected";

interface Seller {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: SellerStatus;
  joinDate: string;
  verificationStatus: "unverified" | "pending" | "verified";
  totalSales: number;
  rating: number;
  reviewCount: number;
  kycDocs: string[];
  bankInfo: { bank: string; accountNumber: string; accountName: string };
  adminNotes: string;
}

const MOCK_SELLERS: Seller[] = [
  {
    id: "s1", businessName: "Adaeze Crafts", ownerName: "Adaeze Okonkwo", email: "adaeze@crafts.ng", phone: "0801 234 5678",
    status: "approved", joinDate: "2025-11-02T10:00:00Z", verificationStatus: "verified",
    totalSales: 1_280_000, rating: 4.8, reviewCount: 96,
    kycDocs: ["CAC Certificate", "BVN Verified", "Utility Bill"],
    bankInfo: { bank: "GTBank", accountNumber: "012•••3456", accountName: "Adaeze Okonkwo" },
    adminNotes: "Verified seller with consistent 5-star reviews.",
  },
  {
    id: "s2", businessName: "Lagos Fabrics Hub", ownerName: "Chukwuemeka Eze", email: "info@lagosfabrics.ng", phone: "0812 345 6789",
    status: "pending", joinDate: "2026-01-15T08:30:00Z", verificationStatus: "pending",
    totalSales: 0, rating: 0, reviewCount: 0,
    kycDocs: ["CAC Certificate"],
    bankInfo: { bank: "Access Bank", accountNumber: "021•••7890", accountName: "Chukwuemeka Eze" },
    adminNotes: "",
  },
  {
    id: "s3", businessName: "Chukwu Electronics", ownerName: "Obiora Chukwu", email: "obiora@chukwutech.ng", phone: "0703 456 7890",
    status: "approved", joinDate: "2025-09-20T14:00:00Z", verificationStatus: "verified",
    totalSales: 4_560_000, rating: 4.6, reviewCount: 214,
    kycDocs: ["CAC Certificate", "BVN Verified", "Utility Bill", "TIN"],
    bankInfo: { bank: "First Bank", accountNumber: "302•••1234", accountName: "Obiora Chukwu" },
    adminNotes: "Top seller. Priority support assigned.",
  },
  {
    id: "s4", businessName: "QuickDeals NG", ownerName: "Babatunde Folarin", email: "quickdeals@ng.com", phone: "0906 789 0123",
    status: "suspended", joinDate: "2025-10-05T09:00:00Z", verificationStatus: "verified",
    totalSales: 890_000, rating: 3.2, reviewCount: 88,
    kycDocs: ["CAC Certificate", "BVN Verified"],
    bankInfo: { bank: "Zenith Bank", accountNumber: "201•••5678", accountName: "Babatunde Folarin" },
    adminNotes: "Suspended: 3 unresolved disputes + counterfeit goods report. Review scheduled 2026-02-01.",
  },
  {
    id: "s5", businessName: "Abuja Pottery Co.", ownerName: "Fatima Usman", email: "fatima@abujapottery.ng", phone: "0805 678 9012",
    status: "pending", joinDate: "2026-02-08T11:15:00Z", verificationStatus: "unverified",
    totalSales: 0, rating: 0, reviewCount: 0,
    kycDocs: [],
    bankInfo: { bank: "UBA", accountNumber: "204•••6789", accountName: "Fatima Usman" },
    adminNotes: "",
  },
];

type Tab = "all" | "pending" | "approved" | "suspended";

const TAB_LABELS: Record<Tab, string> = {
  all: "All",
  pending: "Pending Review",
  approved: "Approved",
  suspended: "Suspended",
};

const STATUS_BADGE: Record<SellerStatus, React.ReactElement> = {
  approved: <Badge variant="success">Approved</Badge>,
  pending: <Badge variant="warning">Pending Review</Badge>,
  suspended: <Badge variant="error">Suspended</Badge>,
  rejected: <Badge variant="default">Rejected</Badge>,
};

const VERIFY_BADGE: Record<Seller["verificationStatus"], React.ReactElement> = {
  verified: <Badge variant="success">Verified</Badge>,
  pending: <Badge variant="warning">Pending</Badge>,
  unverified: <Badge variant="default">Unverified</Badge>,
};

export default function AdminSellersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sellers, setSellers] = useState<Seller[]>(MOCK_SELLERS);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const filtered = sellers.filter((s) => {
    const matchTab = tab === "all" || s.status === tab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.businessName.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  function handleAction(id: string, action: "approve" | "reject" | "suspend") {
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newStatus: SellerStatus =
          action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended";
        const noteText = notes[id] || "";
        return { ...s, status: newStatus, adminNotes: noteText || s.adminNotes };
      })
    );
  }

  const tabCounts: Record<Tab, number> = {
    all: sellers.length,
    pending: sellers.filter((s) => s.status === "pending").length,
    approved: sellers.filter((s) => s.status === "approved").length,
    suspended: sellers.filter((s) => s.status === "suspended").length,
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Seller Management
          </h1>
          <p className="mt-1 text-sm text-slate-light">
            Review, approve, and manage marketplace sellers
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search sellers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
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

      {/* Seller List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="rounded-[--radius-lg] py-12 text-center">
            <p className="text-slate-light">No sellers found.</p>
          </Card>
        ) : (
          filtered.map((seller) => {
            const isOpen = expanded === seller.id;
            return (
              <Card key={seller.id} className="rounded-[--radius-lg] p-0 overflow-hidden">
                {/* Row */}
                <button
                  className="w-full cursor-pointer px-6 py-4 text-left"
                  onClick={() => toggleExpand(seller.id)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-royal/10">
                        <Building2 className="h-5 w-5 text-royal" />
                      </div>
                      <div>
                        <p className="font-semibold text-midnight">{seller.businessName}</p>
                        <p className="text-sm text-slate-light">{seller.ownerName}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {STATUS_BADGE[seller.status]}
                      {VERIFY_BADGE[seller.verificationStatus]}
                      {seller.rating > 0 && (
                        <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {seller.rating.toFixed(1)}
                          <span className="font-normal text-slate-lighter">({seller.reviewCount})</span>
                        </span>
                      )}
                      <span className="text-sm text-slate-light">
                        {seller.totalSales > 0 ? formatNaira(seller.totalSales) : "No sales yet"}
                      </span>
                      <span className="text-sm text-slate-lighter">
                        Joined {formatDate(seller.joinDate)}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-lighter" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-lighter" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="border-t border-mist bg-cloud px-6 py-5">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      {/* Contact & Bank */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-midnight">Contact & Banking</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-slate">
                            <Mail className="h-4 w-4 text-slate-lighter" />
                            {seller.email}
                          </div>
                          <div className="flex items-center gap-2 text-slate">
                            <Phone className="h-4 w-4 text-slate-lighter" />
                            {seller.phone}
                          </div>
                          <div className="flex items-center gap-2 text-slate">
                            <Calendar className="h-4 w-4 text-slate-lighter" />
                            Joined {formatDate(seller.joinDate)}
                          </div>
                        </div>
                        <div className="rounded-[--radius-md] border border-mist bg-white p-3 text-sm">
                          <p className="font-medium text-midnight">{seller.bankInfo.bank}</p>
                          <p className="text-slate-light">{seller.bankInfo.accountNumber}</p>
                          <p className="text-slate-light">{seller.bankInfo.accountName}</p>
                        </div>
                      </div>

                      {/* KYC Docs */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-midnight">KYC Documents</h4>
                        {seller.kycDocs.length === 0 ? (
                          <p className="text-sm text-slate-lighter">No documents submitted</p>
                        ) : (
                          <div className="space-y-2">
                            {seller.kycDocs.map((doc) => (
                              <div
                                key={doc}
                                className="flex items-center gap-2 rounded-[--radius-sm] border border-mist bg-white px-3 py-2 text-sm"
                              >
                                <FileText className="h-4 w-4 text-royal" />
                                <span className="text-slate">{doc}</span>
                                <Shield className="ml-auto h-4 w-4 text-emerald" />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-lighter">
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Total Sales: {seller.totalSales > 0 ? formatNaira(seller.totalSales) : "—"}
                        </div>
                      </div>

                      {/* Admin Notes & Actions */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-midnight">Admin Notes</h4>
                        <Textarea
                          placeholder="Add internal notes…"
                          value={notes[seller.id] ?? seller.adminNotes}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [seller.id]: e.target.value }))
                          }
                          className="min-h-[80px] text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          {seller.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAction(seller.id, "approve")}
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Approve
                            </Button>
                          )}
                          {seller.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(seller.id, "reject")}
                            >
                              <XCircle className="mr-1.5 h-4 w-4" />
                              Reject
                            </Button>
                          )}
                          {seller.status === "approved" && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleAction(seller.id, "suspend")}
                            >
                              <Ban className="mr-1.5 h-4 w-4" />
                              Suspend
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
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
