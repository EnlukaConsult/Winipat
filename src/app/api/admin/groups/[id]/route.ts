import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";

// GET    /api/admin/groups/[id]  -> group + permission keys + members
// PATCH  /api/admin/groups/[id]  -> update { name?, description? }
// DELETE /api/admin/groups/[id]  -> delete (non-system groups only)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: group, error } = await admin
    .from("security_groups")
    .select("id, slug, name, description, is_system, primary_persona")
    .eq("id", id)
    .single();

  if (error || !group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const [{ data: perms }, { data: members }, { data: catalog }] =
    await Promise.all([
      admin.from("group_permissions").select("permission_key").eq("group_id", id),
      admin.from("user_groups").select("user_id, assigned_at").eq("group_id", id),
      admin
        .from("permissions")
        .select("key, description, category")
        .order("category")
        .order("key"),
    ]);

  // Resolve member display info via public_profiles (bypasses the strict
  // profiles RLS so a non-admin groups manager can still see names).
  const memberIds = (members ?? []).map((m) => m.user_id);
  let profiles: { id: string; full_name: string | null; role: string }[] = [];
  if (memberIds.length > 0) {
    const { data } = await admin
      .from("public_profiles")
      .select("id, full_name, role")
      .in("id", memberIds);
    profiles = data ?? [];
  }
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return NextResponse.json({
    group,
    catalog: catalog ?? [],
    permission_keys: (perms ?? []).map((p) => p.permission_key),
    members: (members ?? []).map((m) => ({
      id: m.user_id,
      full_name: byId.get(m.user_id)?.full_name ?? "Winipat user",
      role: byId.get(m.user_id)?.role ?? "",
      assigned_at: m.assigned_at,
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const { name, description } = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
  };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof name === "string") {
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Group name must be at least 2 characters." },
        { status: 400 }
      );
    }
    update.name = name.trim();
  }
  if (typeof description === "string") {
    update.description = description.trim() || null;
  }

  const admin = createAdminClient();

  // System groups (super-admin + persona defaults) have stable names/roles and
  // can't be renamed — matching the DELETE guard, so nobody can relabel
  // "Super Admin" to disguise who holds full access.
  const { data: existing } = await admin
    .from("security_groups")
    .select("is_system")
    .eq("id", id)
    .single();
  if (!existing) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }
  if (existing.is_system) {
    return NextResponse.json(
      { error: "System groups can't be edited." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("security_groups")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const admin = createAdminClient();

  // System groups (super-admin + persona defaults) are not deletable.
  const { data: group } = await admin
    .from("security_groups")
    .select("is_system")
    .eq("id", id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }
  if (group.is_system) {
    return NextResponse.json(
      { error: "System groups cannot be deleted." },
      { status: 400 }
    );
  }

  const { error } = await admin.from("security_groups").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
