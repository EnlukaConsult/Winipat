"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { usePathname } from "next/navigation";

interface DashboardShellProps {
  role: string;
  userName: string;
  avatarUrl: string | null;
  children: React.ReactNode;
}

const titleMap: Record<string, string> = {
  "/dashboard/browse": "Browse Products",
  "/dashboard/cart": "Shopping Cart",
  "/dashboard/orders": "My Orders",
  "/dashboard/messages": "Messages",
  "/dashboard/profile": "Profile",
  "/seller": "Seller Dashboard",
  "/seller/products": "My Products",
  "/seller/products/new": "Add Product",
  "/seller/orders": "Seller Orders",
  "/seller/earnings": "Earnings",
  "/seller/onboarding": "Seller Onboarding",
  "/admin": "Admin Overview",
  "/admin/sellers": "Manage Sellers",
  "/admin/disputes": "Disputes",
  "/admin/settlements": "Settlements",
  "/admin/analytics": "Analytics",
  "/logistics/pickups": "Pickup Assignments",
  "/logistics/deliveries": "Deliveries",
};

export function DashboardShell({ role, userName, avatarUrl, children }: DashboardShellProps) {
  const pathname = usePathname();
  const title = titleMap[pathname] || "Dashboard";

  return (
    <div className="flex min-h-dvh bg-cloud">
      <Sidebar role={role} userName={userName} />
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <DashboardHeader title={title} userName={userName} avatarUrl={avatarUrl} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
