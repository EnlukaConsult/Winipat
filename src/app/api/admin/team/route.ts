import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";

// GET  /api/admin/team        -> { admins: Profile[] }
// POST /api/admin/team        { email }  -> promote existing user to admin
// DELETE /api/admin/team?id=  -> demote admin back to buyer (cannot demote self)
//
// Promotion only works for users who have already signed up. If the email
// isn't in profiles we return 404 with guidance to share the signup link.
// V1: no Supabase email invite — keeps the moving parts down.
export async function GET() {
  const guard = await requirePermission("team.manage");
  if (guard instanceof NextResponse) return guard;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requirePermission("team.manage");
  if (guard instanceof NextResponse) return guard;

  const { email } = (await request.json()) as { email: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .ilike("email", email.trim())
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      {
        error:
          "No user with that email has signed up yet. Ask them to register at /register, then try again.",
      },
      { status: 404 }
    );
  }

  if (existing.role === "admin") {
    return NextResponse.json(
      { error: `${existing.email} is already an admin.` },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", existing.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Grant full access by adding them to super-admin, preserving the historical
  // "admin = full access" behaviour. To create a limited staff member instead,
  // leave them as a buyer/seller and add them to specific groups under
  // /admin/groups. (The role change above also auto-adds the default-admin
  // group via the assign_default_group trigger.)
  const { data: superGroup } = await admin
    .from("security_groups")
    .select("id")
    .eq("slug", "super-admin")
    .single();
  if (superGroup) {
    await admin.from("user_groups").upsert(
      { user_id: existing.id, group_id: superGroup.id, assigned_by: guard.user.id },
      { onConflict: "user_id,group_id", ignoreDuplicates: true }
    );
  }

  await admin.from("notifications").insert({
    user_id: existing.id,
    title: "You're now an admin",
    body: `${guard.user.email} promoted you to admin. Sign out and back in to see the admin portal.`,
    type: "system",
    data: { promoted_by: guard.user.id },
  });

  return NextResponse.json({
    ok: true,
    promoted: { id: existing.id, email: existing.email, full_name: existing.full_name },
  });
}

export async function DELETE(request: Request) {
  const guard = await requirePermission("team.manage");
  if (guard instanceof NextResponse) return guard;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (id === guard.user.id) {
    return NextResponse.json(
      { error: "You can't demote yourself. Ask another admin." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Safety: refuse to leave the platform with zero admins.
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Cannot demote the last remaining admin." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("profiles")
    .update({ role: "buyer" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Strip every non-persona group (super-admin + any staff groups) so the
  // demoted user actually loses admin permissions. The assign_default_group
  // trigger only swaps the persona-default group on role change; it leaves
  // these alone, which would otherwise keep their privileges intact.
  const { data: nonPersonaGroups } = await admin
    .from("security_groups")
    .select("id")
    .is("primary_persona", null);
  const groupIds = (nonPersonaGroups ?? []).map((g) => g.id);
  if (groupIds.length > 0) {
    await admin
      .from("user_groups")
      .delete()
      .eq("user_id", id)
      .in("group_id", groupIds);
  }

  return NextResponse.json({ ok: true });
}
