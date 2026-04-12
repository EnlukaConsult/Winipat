import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "buyer";
  const userName = profile?.full_name || user.email || "User";
  const avatarUrl = profile?.avatar_url || null;

  return (
    <DashboardShell role={role} userName={userName} avatarUrl={avatarUrl}>
      {children}
    </DashboardShell>
  );
}
