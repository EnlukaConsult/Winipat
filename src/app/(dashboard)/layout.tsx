import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import { getMyPermissions } from "@/lib/permissions";

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

  // Email verification gate: if Supabase Auth has "Confirm email" enabled,
  // user.email_confirmed_at will be null until the user clicks the link.
  // Hold them at /verify until then. Skip this for the verify page itself
  // so they're not bounced in a loop.
  if (!user.email_confirmed_at && !user.confirmed_at) {
    redirect(`/verify?email=${encodeURIComponent(user.email ?? "")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "buyer";
  const userName = profile?.full_name || user.email || "User";
  const avatarUrl = profile?.avatar_url || null;
  const email = user.email ?? "";

  // Permissions drive which gated nav items (e.g. Security Groups) are shown.
  const permissions = await getMyPermissions();

  return (
    <DashboardShell
      role={role}
      userName={userName}
      email={email}
      avatarUrl={avatarUrl}
      permissions={permissions}
    >
      {children}
    </DashboardShell>
  );
}
