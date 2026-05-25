"use client";

import {
  Bell,
  ChevronLeft,
  ArrowLeft,
  LogOut,
  Settings,
  User as UserIcon,
  CheckCheck,
  Inbox,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  userName: string;
  avatarUrl?: string | null;
  role?: string;
  email?: string;
}

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown> | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Sub-pages render a back chevron + the parent section name as a breadcrumb.
// For top-level pages the title shows on its own.
function deriveBreadcrumb(pathname: string): { parentLabel: string; parentHref: string } | null {
  const map: Array<{ prefix: string; label: string; href: string }> = [
    { prefix: "/dashboard/orders/",        label: "My Orders",        href: "/dashboard/orders" },
    { prefix: "/dashboard/product/",       label: "Browse",           href: "/dashboard/browse" },
    { prefix: "/seller/products/new",      label: "My Products",      href: "/seller/products" },
    { prefix: "/seller/products/bulk",     label: "My Products",      href: "/seller/products" },
    { prefix: "/seller/orders/",           label: "Seller Orders",    href: "/seller/orders" },
    { prefix: "/admin/sellers/",           label: "Sellers",          href: "/admin/sellers" },
    { prefix: "/admin/disputes/",          label: "Disputes",         href: "/admin/disputes" },
    { prefix: "/admin/payouts/",           label: "Payouts",          href: "/admin/payouts" },
  ];
  for (const m of map) {
    if (pathname.startsWith(m.prefix) && pathname !== m.href) {
      return { parentLabel: m.label, parentHref: m.href };
    }
  }
  return null;
}

// Top-level destinations don't need a back button — they're already
// the root of their section, accessed from the sidebar.
const TOP_LEVEL_ROUTES = new Set([
  "/dashboard/browse",
  "/dashboard/cart",
  "/dashboard/orders",
  "/dashboard/messages",
  "/dashboard/profile",
  "/seller",
  "/seller/products",
  "/seller/orders",
  "/seller/disputes",
  "/seller/earnings",
  "/seller/onboarding",
  "/admin",
  "/admin/sellers",
  "/admin/disputes",
  "/admin/settlements",
  "/admin/payouts",
  "/admin/analytics",
  "/admin/team",
  "/admin/settings",
  "/logistics/pickups",
  "/logistics/deliveries",
]);

export function DashboardHeader({ title, userName, avatarUrl, role, email }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const breadcrumb = deriveBreadcrumb(pathname);
  const showBackButton = !TOP_LEVEL_ROUTES.has(pathname);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Click-outside close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadingNotifs(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, type, is_read, created_at, data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    const rows = (data || []) as Notification[];
    setNotifications(rows);
    setUnreadCount(rows.filter((n) => !n.is_read).length);
    setLoadingNotifs(false);
  }, []);

  // Initial load + polling every 60s for the unread badge
  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 60_000);
    return () => clearInterval(t);
  }, [loadNotifications]);

  // Reload when opening so the user sees fresh data
  useEffect(() => {
    if (notifOpen) loadNotifications();
  }, [notifOpen, loadNotifications]);

  async function markAllRead() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markOneRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const settingsHref =
    role === "admin"
      ? "/admin/settings"
      : role === "seller"
      ? "/seller/onboarding"
      : "/dashboard/profile";

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-mist">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 min-w-0">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-[--radius-md] hover:bg-mist transition-colors cursor-pointer text-slate-light hover:text-violet"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          {breadcrumb && (
            <Link
              href={breadcrumb.parentHref}
              className="hidden sm:flex items-center gap-1 text-xs text-slate-light hover:text-violet transition-colors px-2 py-1 rounded-md hover:bg-violet/5"
            >
              <ChevronLeft size={14} />
              {breadcrumb.parentLabel}
            </Link>
          )}
          <h1 className="text-xl font-bold text-midnight font-[family-name:var(--font-sora)] truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-[--radius-md] hover:bg-mist transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-slate-light" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[--radius-lg] bg-white shadow-xl border border-mist overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-mist">
                  <p className="text-sm font-semibold text-midnight">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-violet hover:text-violet-dark"
                    >
                      <CheckCheck size={12} />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifs && notifications.length === 0 ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-mist rounded-md animate-pulse" />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Inbox className="mx-auto mb-2 text-slate-lighter" size={28} />
                      <p className="text-sm text-slate-light">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markOneRead(n.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-b border-mist/60 last:border-0 hover:bg-cloud/50 transition-colors",
                          !n.is_read && "bg-violet/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm",
                              !n.is_read
                                ? "font-semibold text-midnight"
                                : "text-slate"
                            )}
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-lighter shrink-0 mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-light mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="rounded-full hover:ring-2 hover:ring-violet/20 transition-all cursor-pointer"
            >
              <Avatar name={userName} src={avatarUrl} size="sm" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-[--radius-lg] bg-white shadow-xl border border-mist overflow-hidden">
                <div className="px-4 py-3 border-b border-mist">
                  <div className="flex items-center gap-3">
                    <Avatar name={userName} src={avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-midnight truncate">
                        {userName}
                      </p>
                      {email && (
                        <p className="text-xs text-slate-light truncate">{email}</p>
                      )}
                      {role && (
                        <p className="text-[10px] text-violet capitalize mt-0.5">
                          {role}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate hover:bg-cloud/50"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserIcon size={14} className="text-slate-light" />
                  Profile
                </Link>
                <Link
                  href={settingsHref}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate hover:bg-cloud/50"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings size={14} className="text-slate-light" />
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/5 border-t border-mist"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
