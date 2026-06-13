import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { GroupsClient } from "./groups-client";

// Security Groups list. Server-guards on groups.manage (UI + nav already
// hide it, but a direct URL hit must be blocked too); real enforcement is
// the API + RLS layer.
export default async function GroupsPage() {
  if (!(await hasPermission("groups.manage"))) {
    redirect("/admin");
  }
  return <GroupsClient />;
}
