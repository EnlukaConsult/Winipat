import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { sendEmail, emails } from "@/lib/email";

// PATCH /api/admin/enquiries/[id]
// body: { status?, notes?, reply? }
//
// reply: { body: string }  — when present, sends a branded email to the
// enquirer via Resend and auto-flips status to 'resolved'.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const { status, notes, reply } = (await request.json()) as {
    status?: "new" | "in_progress" | "resolved" | "spam";
    notes?: string;
    reply?: { body: string };
  };

  const admin = createAdminClient();

  // If a reply was provided, send it first
  if (reply?.body?.trim()) {
    const { data: enquiry } = await admin
      .from("support_enquiries")
      .select("name, email, subject")
      .eq("id", id)
      .single();
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const adminName =
      guard.user.email?.split("@")[0]?.replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "Winipat Support";

    const send = await sendEmail({
      to: enquiry.email,
      replyTo: "support@winipat.com",
      ...emails.adminReply({
        toName: enquiry.name,
        originalSubject: enquiry.subject,
        replyBody: reply.body.trim(),
        adminName,
      }),
    });

    if (!send.ok) {
      return NextResponse.json(
        { error: `Reply could not be sent: ${send.error}` },
        { status: 500 }
      );
    }

    // Append the reply to admin_notes for audit
    const stamp = new Date().toISOString();
    const replyLog = `\n\n[reply sent ${stamp} by ${adminName}]\n${reply.body.trim()}`;
    const { data: current } = await admin
      .from("support_enquiries")
      .select("admin_notes")
      .eq("id", id)
      .single();
    const combinedNotes = (current?.admin_notes || "") + replyLog;

    await admin
      .from("support_enquiries")
      .update({
        admin_notes: combinedNotes,
        status: "resolved",
        resolved_at: stamp,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, sent: true, status: "resolved" });
  }

  // Otherwise just a status / notes update
  if (status && !["new", "in_progress", "resolved", "spam"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (notes !== undefined) update.admin_notes = notes;
  if (status === "resolved") update.resolved_at = new Date().toISOString();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await admin
    .from("support_enquiries")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: status || "updated" });
}
