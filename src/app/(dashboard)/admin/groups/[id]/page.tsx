import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { GroupDetailClient } from "./group-detail-client";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasPermission("groups.manage"))) {
    redirect("/admin");
  }
  const { id } = await params;
  return <GroupDetailClient groupId={id} />;
}
