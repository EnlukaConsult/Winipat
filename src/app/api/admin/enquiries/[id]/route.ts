import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";

// PATCH /api/admin/enquiries/[id]
// body: { status: 'new'|'in_progress'|'resolved'|'spam', notes?: string }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const { status, notes } = (await request.json()) as {
    status: "new" | "in_progress" | "resolved" | "spam";
    notes?: string;
  };

  if (!["new", "in_progress", "resolved", "spam"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const update: Record<string, unknown> = { status };
  if (notes !== undefined) update.admin_notes = notes;
  if (status === "resolved") update.resolved_at = new Date().toISOString();

  const { error } = await admin
    .from("support_enquiries")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status });
}
