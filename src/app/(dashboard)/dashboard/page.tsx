import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/utils";

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
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) || "buyer";

  switch (role) {
    case "admin":
      redirect("/admin");
    case "seller":
      redirect("/seller");
    case "logistics":
      redirect("/logistics/pickups");
    default:
      redirect("/dashboard/browse");
  }
}
