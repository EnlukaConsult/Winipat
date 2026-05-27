import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/utils";
import { BuyerHome } from "./buyer-home";

// /dashboard is the buyer home page. Non-buyer roles bounce to their own
// portal (admin/seller/logistics get their landing page; nothing here
// makes sense for them). Buyers get the full Phase 1 home: hero, trust
// bar, order tracker, stats, continue-browsing.
//
// Was previously a router that pushed buyers straight to /dashboard/browse;
// now buyers land here first and can click into Browse from the hero CTA.
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) || "buyer";

  // Role-aware redirects for non-buyers. Buyer falls through to render
  // the home page.
  switch (role) {
    case "admin":
      redirect("/admin");
    case "seller":
      redirect("/seller");
    case "logistics":
      redirect("/logistics/pickups");
  }

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  return <BuyerHome firstName={firstName} />;
}
