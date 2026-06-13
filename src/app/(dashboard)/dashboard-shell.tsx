"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { SellerFab } from "@/components/seller/seller-fab";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";

interface DashboardShellProps {
  role: string;
  userName: string;
  email?: string;
  avatarUrl: string | null;
  permissions?: string[];
  children: React.ReactNode;
}

const titleMap: Record<string, string> = {
  "/dashboard":             "Home",
  "/dashboard/browse":      "Browse Products",
  "/dashboard/cart":        "Shopping Cart",
  "/dashboard/orders":      "My Orders",
  "/dashboard/messages":    "Messages",
  "/dashboard/profile":     "Profile",
  "/seller":                "Seller Dashboard",
  "/seller/products":       "My Products",
  "/seller/products/new":   "Add Product",
  "/seller/products/bulk":  "Bulk Upload",
  "/seller/orders":         "Seller Orders",
  "/seller/earnings":       "Earnings",
  "/seller/onboarding":     "Seller Onboarding",
  "/seller/disputes":       "Resolution Center",
  "/admin":                 "Admin Overview",
  "/admin/sellers":         "Manage Sellers",
  "/admin/disputes":        "Disputes",
  "/admin/settlements":     "Settlements",
  "/admin/payouts":         "Payouts",
  "/admin/enquiries":       "Enquiries",
  "/admin/analytics":       "Analytics",
  "/admin/settings":        "Platform Settings",
  "/admin/team":            "Admin Team",
  "/admin/groups":          "Security Groups",
  "/logistics/pickups":     "Pickup Assignments",
  "/logistics/deliveries":  "Deliveries",
};

function titleFor(pathname: string): string {
  if (titleMap[pathname]) return titleMap[pathname];
  if (pathname.startsWith("/dashboard/orders/"))  return "Order Detail";
  if (pathname.startsWith("/dashboard/product/")) return "Product Detail";
  if (pathname.startsWith("/admin/sellers/"))     return "Seller Detail";
  if (pathname.startsWith("/admin/disputes/"))    return "Dispute Detail";
  if (pathname.startsWith("/admin/groups/"))      return "Security Group";
  return "Dashboard";
}

// Per-section permission required to view an admin area. The data itself is
// already protected by RLS (migration 017) and the API guards; this map only
// drives a friendly "access restricted" screen so a staffer who lacks a
// permission gets a clear message instead of an empty page. Longest matching
// prefix wins.
const ADMIN_SECTION_PERMISSION: Array<{ prefix: string; perm: string }> = [
  { prefix: "/admin/sellers",     perm: "sellers.view" },
  { prefix: "/admin/disputes",    perm: "disputes.view" },
  { prefix: "/admin/settlements", perm: "settlements.view" },
  { prefix: "/admin/payouts",     perm: "payouts.view" },
  { prefix: "/admin/enquiries",   perm: "enquiries.manage" },
  { prefix: "/admin/analytics",   perm: "analytics.view" },
  { prefix: "/admin/team",        perm: "team.manage" },
  { prefix: "/admin/groups",      perm: "groups.manage" },
  { prefix: "/admin/settings",    perm: "settings.manage" },
];

function requiredAdminPermission(pathname: string): string | null {
  const match = ADMIN_SECTION_PERMISSION.find(
    (s) => pathname === s.prefix || pathname.startsWith(s.prefix + "/")
  );
  return match?.perm ?? null;
}

export function DashboardShell({
  role,
  userName,
  email,
  avatarUrl,
  permissions,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const title = titleFor(pathname);

  // Per-section access gate (UX layer; RLS + API are the real enforcement).
  const requiredPerm = requiredAdminPermission(pathname);
  const sectionRestricted =
    requiredPerm !== null &&
    permissions !== undefined &&
    !permissions.includes(requiredPerm);

  return (
    <div className="flex min-h-dvh bg-cloud">
      <Sidebar role={role} userName={userName} permissions={permissions} />
      <div className="flex-1 flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 min-w-0">
        <DashboardHeader
          title={title}
          userName={userName}
          avatarUrl={avatarUrl}
          role={role}
          email={email}
        />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {sectionRestricted ? (
            <div className="mx-auto max-w-md mt-12 text-center rounded-[--radius-lg] border border-mist bg-white p-8 shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
                <Lock size={22} aria-hidden="true" />
              </div>
              <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-midnight">
                Access restricted
              </h2>
              <p className="mt-1 text-sm text-slate-light">
                You don&apos;t have permission to view this section. Ask an admin
                to add you to a security group that grants it.
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet hover:underline"
              >
                Back to overview
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile floating "Add product" button — only renders for sellers
          inside /seller/* (component does the path + role gate itself). */}
      {role === "seller" && <SellerFab />}
    </div>
  );
}
