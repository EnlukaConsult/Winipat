import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

// Server-side baseline guard for the whole /admin/* tree: you must hold
// `admin.access` (granted by every admin group) to enter the admin portal
// at all. Per-section read access is enforced at the data layer by RLS
// (migration 017) and per-action by the requirePermission() API guards;
// the dashboard shell adds a friendly per-section "access restricted"
// message on top of this.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasPermission("admin.access"))) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
