"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { SellerFab } from "@/components/seller/seller-fab";
import { usePathname } from "next/navigation";

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
          {children}
        </main>
      </div>

      {/* Mobile floating "Add product" button — only renders for sellers
          inside /seller/* (component does the path + role gate itself). */}
      {role === "seller" && <SellerFab />}
    </div>
  );
}
