import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";
import { getMyPermissions } from "@/lib/permissions";

// PUT /api/admin/groups/[id]/permissions  { keys: string[] }
// Replaces the group's permission set with the given keys.
//
// super-admin's permissions are locked (it always holds everything) to
// prevent accidentally stripping the only fully-privileged group.

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const { keys } = (await request.json().catch(() => ({}))) as {
    keys?: string[];
  };

  if (!Array.isArray(keys)) {
    return NextResponse.json(
      { error: "keys must be an array of permission keys." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: group } = await admin
    .from("security_groups")
    .select("slug")
    .eq("id", id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }
  if (group.slug === "super-admin") {
    return NextResponse.json(
      { error: "Super Admin permissions are locked." },
      { status: 400 }
    );
  }

  // Validate the keys against the catalog so we never insert garbage that
  // would fail the FK (and to give a clean error).
  const { data: validRows } = await admin.from("permissions").select("key");
  const valid = new Set((validRows ?? []).map((r) => r.key));
  const cleaned = Array.from(new Set(keys)).filter((k) => valid.has(k));

  // Anti-escalation: you can only assign permissions you hold yourself, so a
  // delegated group manager can't mint themselves payouts.approve, groups.manage,
  // etc. Super-admins hold everything, so they're unrestricted.
  const callerPerms = new Set(await getMyPermissions());
  const escalating = cleaned.filter((k) => !callerPerms.has(k));
  if (escalating.length > 0) {
    return NextResponse.json(
      {
        error: `You can only grant permissions you hold yourself. Missing: ${escalating.join(
          ", "
        )}`,
      },
      { status: 403 }
    );
  }

  // Replace: delete existing, insert the new set.
  const del = await admin.from("group_permissions").delete().eq("group_id", id);
  if (del.error) {
    return NextResponse.json({ error: del.error.message }, { status: 500 });
  }

  if (cleaned.length > 0) {
    const rows = cleaned.map((key) => ({ group_id: id, permission_key: key }));
    const ins = await admin.from("group_permissions").insert(rows);
    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: cleaned.length });
}
