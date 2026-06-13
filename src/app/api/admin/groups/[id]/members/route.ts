import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";
import { getMyPermissions } from "@/lib/permissions";

// POST   /api/admin/groups/[id]/members   { userId }
// DELETE /api/admin/groups/[id]/members?userId=...
//
// Add/remove a user from a group. Guards against self-lockout: you cannot
// remove yourself from a group that grants `groups.manage`.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const { id: groupId } = await params;
  const { userId, email } = (await request.json().catch(() => ({}))) as {
    userId?: string;
    email?: string;
  };

  if (!userId && !email) {
    return NextResponse.json(
      { error: "Provide a userId or an email." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Resolve the target user by id or email.
  const lookup = admin.from("profiles").select("id");
  const { data: target } = userId
    ? await lookup.eq("id", userId).maybeSingle()
    : await lookup.eq("email", (email ?? "").trim()).maybeSingle();

  if (!target) {
    return NextResponse.json(
      {
        error: email
          ? "No account with that email. They must register first."
          : "User not found.",
      },
      { status: 404 }
    );
  }

  // Anti-escalation: you can't add someone to a group that grants permissions
  // you don't hold yourself (e.g. a delegated manager adding an accomplice —
  // or themselves — to super-admin). Super-admins hold everything, so they're
  // unrestricted.
  const callerPerms = new Set(await getMyPermissions());
  const { data: groupPerms } = await admin
    .from("group_permissions")
    .select("permission_key")
    .eq("group_id", groupId);
  const exceeds = (groupPerms ?? [])
    .map((r) => r.permission_key)
    .filter((k) => !callerPerms.has(k));
  if (exceeds.length > 0) {
    return NextResponse.json(
      {
        error:
          "You can't add members to a group that grants permissions you don't hold yourself.",
      },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("user_groups")
    .upsert(
      { user_id: target.id, group_id: groupId, assigned_by: guard.user.id },
      { onConflict: "user_id,group_id", ignoreDuplicates: true }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("groups.manage");
  if (guard instanceof NextResponse) return guard;

  const { id: groupId } = await params;
  const userId = new URL(request.url).searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Self-lockout guard: don't let a manager strip their own access to the
  // group-management permission.
  if (userId === guard.user.id) {
    const { data: grants } = await admin
      .from("group_permissions")
      .select("permission_key")
      .eq("group_id", groupId)
      .eq("permission_key", "groups.manage");
    if (grants && grants.length > 0) {
      return NextResponse.json(
        {
          error:
            "You can't remove yourself from a group that grants group-management access.",
        },
        { status: 400 }
      );
    }
  }

  const { error } = await admin
    .from("user_groups")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
