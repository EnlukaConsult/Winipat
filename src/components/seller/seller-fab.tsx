"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

// Floating Action Button for sellers on mobile. Sits above the bottom
// nav bar (which lives at h-16 with a safe-area inset) and links to
// the "Add product" page from anywhere in the seller portal.
//
// Hidden on:
//   - desktop (md+), since the sidebar already has Add Product
//   - the add-product page itself (would just link to itself)
export function SellerFab() {
  const pathname = usePathname();
  if (!pathname.startsWith("/seller")) return null;
  if (pathname === "/seller/products/new") return null;

  return (
    <Link
      href="/seller/products/new"
      aria-label="Add a new product"
      title="Add product"
      className="md:hidden fixed right-4 z-30 inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold text-midnight font-bold shadow-[0_12px_28px_rgba(244,201,93,0.45)] hover:bg-gold-dark active:scale-95 transition-all"
      style={{
        // Sit above the bottom nav (h-16 = 4rem) + iOS safe area
        bottom: "calc(4rem + 1rem + env(safe-area-inset-bottom))",
      }}
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
    </Link>
  );
}
