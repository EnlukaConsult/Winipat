"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo, ShieldIcon } from "@/components/ui/logo";
import {
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
  BarChart3,
  Banknote,
  Truck,
  ClipboardList,
  LogOut,
  ChevronLeft,
  Menu,
  Sliders,
  Mail,
  X,
  Wallet,
  LifeBuoy,
  ShieldCheck,
  Upload,
  Home,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  // When set, the item only shows if the user holds this permission key.
  requires?: string;
};

// Sections are an optional grouping layer. Roles with 6+ items get
// section headers ("Store", "Finance", "Trust & Compliance", "Support")
// so the desktop sidebar reads less like a flat ERP menu. Roles with
// fewer items keep the flat shape.
type NavSection = { section: string | null; items: NavItem[] };

const buyerNav: NavSection[] = [
  {
    section: null,
    items: [
      { label: "Home",     href: "/dashboard",          icon: Home },
      { label: "Browse",   href: "/dashboard/browse",   icon: Search },
      { label: "Cart",     href: "/dashboard/cart",     icon: ShoppingCart },
      { label: "Orders",   href: "/dashboard/orders",   icon: Package },
      { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
      { label: "Profile",  href: "/dashboard/profile",  icon: User },
      { label: "Support",  href: "/contact",            icon: Mail },
    ],
  },
];

const sellerNav: NavSection[] = [
  {
    section: "Store",
    items: [
      { label: "Dashboard",   href: "/seller",                icon: LayoutDashboard },
      { label: "Products",    href: "/seller/products",       icon: Store },
      { label: "Add Product", href: "/seller/products/new",   icon: Plus },
      { label: "Bulk Upload", href: "/seller/products/bulk",  icon: Upload },
      { label: "Orders",      href: "/seller/orders",         icon: Package },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Earnings",    href: "/seller/earnings",       icon: Wallet },
    ],
  },
  {
    section: "Trust & Compliance",
    items: [
      { label: "Onboarding & KYC",  href: "/seller/onboarding", icon: ShieldCheck },
      { label: "Resolution Center", href: "/seller/disputes",   icon: LifeBuoy },
    ],
  },
  {
    section: "Support",
    items: [
      { label: "Help Center", href: "/contact", icon: Mail },
    ],
  },
];

const adminNav: NavSection[] = [
  {
    section: null,
    items: [
      { label: "Overview",    href: "/admin",             icon: LayoutDashboard },
      { label: "Sellers",     href: "/admin/sellers",     icon: Users,      requires: "sellers.view" },
      { label: "Disputes",    href: "/admin/disputes",    icon: LifeBuoy,   requires: "disputes.view" },
      { label: "Settlements", href: "/admin/settlements", icon: Banknote,   requires: "settlements.view" },
      { label: "Payouts",     href: "/admin/payouts",     icon: DollarSign, requires: "payouts.view" },
      { label: "Enquiries",   href: "/admin/enquiries",   icon: Mail,       requires: "enquiries.manage" },
      { label: "Analytics",   href: "/admin/analytics",   icon: BarChart3,  requires: "analytics.view" },
      { label: "Team",        href: "/admin/team",        icon: User,       requires: "team.manage" },
      { label: "Groups",      href: "/admin/groups",      icon: ShieldCheck, requires: "groups.manage" },
      { label: "Settings",    href: "/admin/settings",    icon: Sliders,    requires: "settings.manage" },
    ],
  },
];

const logisticsNav: NavSection[] = [
  {
    section: null,
    items: [
      { label: "Pickups",    href: "/logistics/pickups",    icon: ClipboardList },
      { label: "Deliveries", href: "/logistics/deliveries", icon: Truck },
    ],
  },
];

const navMap: Record<string, NavSection[]> = {
  buyer: buyerNav,
  seller: sellerNav,
  admin: adminNav,
  logistics: logisticsNav,
};

// Flatten sections back to a list — used by mobile bottom nav, which
// can't show section headers and just slices the first N items.
function flattenSections(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}

// Is this nav item the "active" one for the current path?
//
// The naive `pathname === href || pathname.startsWith(href + "/")` works
// for most items but breaks for the buyer Home link (`/dashboard`),
// because every buyer sub-route starts with `/dashboard/`. We treat
// short "root" hrefs as exact-match only when there's a more specific
// child route present in the nav list.
function isItemActive(
  pathname: string,
  href: string,
  allHrefs: string[]
): boolean {
  if (pathname === href) return true;
  const hasMoreSpecificMatch = allHrefs.some(
    (h) =>
      h !== href &&
      h.startsWith(href + "/") &&
      (pathname === h || pathname.startsWith(h + "/"))
  );
  if (hasMoreSpecificMatch) return false;
  return pathname.startsWith(href + "/");
}

interface SidebarProps {
  role: string;
  userName: string;
  permissions?: string[];
}

export function Sidebar({ role, userName, permissions }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const permSet = new Set(permissions ?? []);
  // Drop permission-gated items the user can't access before any rendering
  // (mobile/desktop both derive from `sections`).
  const sections = (navMap[role] || buyerNav).map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.requires || permSet.has(i.requires)),
  }));
  const items = flattenSections(sections);

  // Mobile nav strategy: show first 4 items inline, hide the rest behind
  // a "More" overflow drawer. Sellers (9 items) and admins (9 items)
  // previously lost access to ~half their sidebar on mobile.
  const primaryMobile = items.slice(0, 4);
  const overflow = items.slice(4);
  const allHrefs = items.map((i) => i.href);
  const overflowActive = overflow.some((i) =>
    isItemActive(pathname, i.href, allHrefs)
  );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile bottom nav — sticky to viewport bottom, respects iOS
          home-indicator safe area via pb-[env(safe-area-inset-bottom)]. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-mist md:hidden pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary navigation"
      >
        <div className="flex items-stretch justify-around">
          {primaryMobile.map((item) => {
            const isActive = isItemActive(pathname, item.href, allHrefs);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-2 text-[11px] transition-colors",
                  isActive ? "text-royal" : "text-slate-light"
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More navigation items"
              aria-expanded={moreOpen}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-2 text-[11px] transition-colors",
                overflowActive ? "text-royal" : "text-slate-light"
              )}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>

      {/* Overflow drawer (mobile only). Shown as a bottom sheet so it
          stays close to the nav the user tapped, not a hamburger from
          the top. */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-midnight/60 backdrop-blur-sm"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-mist">
              <p className="text-sm font-semibold text-midnight">Menu</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="p-2 -mr-2 text-slate-light hover:text-midnight min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="py-2">
              {overflow.map((item) => {
                const isActive = isItemActive(pathname, item.href, allHrefs);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 min-h-[48px] text-sm transition-colors",
                        isActive
                          ? "text-royal bg-royal/5 font-semibold"
                          : "text-slate hover:bg-mist"
                      )}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  onClick={async () => {
                    setMoreOpen(false);
                    await handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 min-h-[48px] text-sm text-error hover:bg-error/5 transition-colors border-t border-mist mt-1"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

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

        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {sections.map((section, sectionIdx) => (
            <div
              key={section.section ?? `section-${sectionIdx}`}
              className={sectionIdx > 0 ? "mt-5" : undefined}
            >
              {section.section && !collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                  {section.section}
                </p>
              )}
              {section.section && collapsed && sectionIdx > 0 && (
                <div className="mx-3 mb-2 h-px bg-white/10" aria-hidden="true" />
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isItemActive(pathname, item.href, allHrefs);
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
              </div>
            </div>
          ))}
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
