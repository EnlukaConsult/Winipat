import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/admin-guard";
import { sendEmail, emails } from "@/lib/email";

// POST /api/admin/sellers/[id]/status
// body: { status: 'approved' | 'rejected' | 'under_review', notes?: string }
// Approving stamps approved_at and notifies the seller. Rejecting / suspending
// (modeled as rejected here) records admin_notes so the seller sees why.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("sellers.approve");
  if (guard instanceof NextResponse) return guard;

  const { id: sellerId } = await params;
  const { status, notes } = (await request.json()) as {
    status: "approved" | "rejected" | "under_review";
    notes?: string;
  };

  if (!["approved", "rejected", "under_review"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();

  const update: Record<string, unknown> = {
    status,
    admin_notes: notes ?? null,
  };
  if (status === "approved") update.approved_at = new Date().toISOString();

  const { error } = await admin.from("sellers").update(update).eq("id", sellerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch seller details for email + in-app notification copy
  const { data: seller } = await admin
    .from("sellers")
    .select("business_name, profile:profiles!id(full_name, email)")
    .eq("id", sellerId)
    .single();
  const profile = Array.isArray(seller?.profile) ? seller.profile[0] : seller?.profile;

  // Look up seller's user id (sellers.id IS the profile id) — notify
  const title =
    status === "approved"
      ? "Your seller account is approved"
      : status === "rejected"
      ? "Your seller application was rejected"
      : "Your seller application is under review";
  const body =
    status === "approved"
      ? "You can now publish products and receive orders."
      : notes || `Status changed to ${status}.`;

  await admin.from("notifications").insert({
    user_id: sellerId,
    title,
    body,
    type: "system",
    data: { seller_id: sellerId, status },
  });

  // Send branded email — only for approval right now; rejection/under-review
  // gets the in-app notification only, since those notes are often back-and-
  // forth and we don't want to email at every status flip.
  if (status === "approved" && profile?.email) {
    await sendEmail({
      to: profile.email,
      ...emails.sellerApproved(
        profile.full_name || "there",
        seller?.business_name || "your store"
      ),
    });
  }

  return NextResponse.json({ ok: true, status });
}
