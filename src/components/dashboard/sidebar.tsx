"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo, ShieldIcon } from "@/components/ui/logo";
import {
  Home,
  Search,
  ShoppingCart,
  Package,
  MessageSquare,
  User,
  Store,
  LayoutDashboard,
  Plus,
  DollarSign,
  Users,
  AlertTriangle,
  BarChart3,
  Banknote,
  Truck,
  ClipboardList,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const buyerNav: NavItem[] = [
  { label: "Browse", href: "/dashboard/browse", icon: Search },
  { label: "Cart", href: "/dashboard/cart", icon: ShoppingCart },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

const sellerNav: NavItem[] = [
  { label: "Dashboard", href: "/seller", icon: LayoutDashboard },
  { label: "Products", href: "/seller/products", icon: Store },
  { label: "Add Product", href: "/seller/products/new", icon: Plus },
  { label: "Orders", href: "/seller/orders", icon: Package },
  { label: "Earnings", href: "/seller/earnings", icon: DollarSign },
];

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: BarChart3 },
  { label: "Sellers", href: "/admin/sellers", icon: Users },
  { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { label: "Settlements", href: "/admin/settlements", icon: Banknote },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

const logisticsNav: NavItem[] = [
  { label: "Pickups", href: "/logistics/pickups", icon: ClipboardList },
  { label: "Deliveries", href: "/logistics/deliveries", icon: Truck },
];

const navMap: Record<string, NavItem[]> = {
  buyer: buyerNav,
  seller: sellerNav,
  admin: adminNav,
  logistics: logisticsNav,
};

interface SidebarProps {
  role: string;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const items = navMap[role] || buyerNav;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-mist md:hidden">
        <div className="flex items-center justify-around py-2">
          {items.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors",
                  isActive ? "text-royal" : "text-slate-light"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-dvh sticky top-0 bg-midnight text-white transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!collapsed ? (
            <Link href="/">
              <Logo size="md" theme="dark" />
            </Link>
          ) : (
            <Link href="/">
              <ShieldIcon size={28} />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-[--radius-sm] hover:bg-white/10 transition-colors"
          >
            {collapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[--radius-md] transition-colors text-sm",
                  isActive
                    ? "bg-royal text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          {!collapsed && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-white/50 capitalize">{role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[--radius-md] text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm"
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
