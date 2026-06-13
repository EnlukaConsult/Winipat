import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";

// GET  /api/admin/groups   -> list groups with permission keys + member counts
// POST /api/admin/groups   -> create a custom group { name, description? }
//
// All group management requires the `groups.manage` permission.

export async function GET() {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const admin = createAdminClient();

  const [{ data: groups }, { data: perms }, { data: members }] =
    await Promise.all([
      admin
        .from("security_groups")
        .select("id, slug, name, description, is_system, primary_persona")
        .order("is_system", { ascending: false })
        .order("name"),
      admin.from("group_permissions").select("group_id, permission_key"),
      admin.from("user_groups").select("group_id"),
    ]);

  const permsByGroup = new Map<string, string[]>();
  for (const row of perms ?? []) {
    const list = permsByGroup.get(row.group_id) ?? [];
    list.push(row.permission_key);
    permsByGroup.set(row.group_id, list);
  }

  const countByGroup = new Map<string, number>();
  for (const row of members ?? []) {
    countByGroup.set(row.group_id, (countByGroup.get(row.group_id) ?? 0) + 1);
  }

  const shaped = (groups ?? []).map((g) => ({
    ...g,
    permission_keys: permsByGroup.get(g.id) ?? [],
    member_count: countByGroup.get(g.id) ?? 0,
  }));

  return NextResponse.json({ groups: shaped });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(request: Request) {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const { name, description } = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
  };

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Group name must be at least 2 characters." },
      { status: 400 }
    );
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json(
      { error: "Group name must contain letters or numbers." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("security_groups")
    .insert({
      slug,
      name: name.trim(),
      description: description?.trim() || null,
      is_system: false,
      primary_persona: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Unique violation on slug -> friendly message.
    const dup = error?.code === "23505";
    return NextResponse.json(
      {
        error: dup
          ? "A group with a similar name already exists."
          : error?.message ?? "Failed to create group.",
      },
      { status: dup ? 409 : 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}
