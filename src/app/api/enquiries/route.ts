import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emails, SUPPORT_INBOX } from "@/lib/email";

// POST /api/enquiries
// Accepts a public contact-form submission. Works for both signed-in
// users (we stamp user_id) and unauthed visitors. Categories must match
// the enquiry_category enum from migration 007.
//
// V1 doesn't actually send an email — admins get an in-app notification
// (via DB trigger) and can reply via mailto: from /admin/enquiries.
// Wiring Resend/SendGrid is a one-line swap later.
type Body = {
  name?: string;
  email?: string;
  phone?: string;
  category?: string;
  subject?: string;
  message?: string;
  chatContext?: string;
  hp?: string; // honeypot — must be empty
};

const VALID_CATEGORIES = new Set([
  "order_issue",
  "payment",
  "seller_application",
  "kyc_question",
  "dispute_help",
  "partnership",
  "feedback",
  "other",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;

  // Honeypot — bots fill hidden fields, humans don't
  if (body.hp) return NextResponse.json({ ok: true }); // pretend success, drop silently

  const name    = body.name?.trim();
  const email   = body.email?.trim();
  const subject = body.subject?.trim();
  const message = body.message?.trim();
  const category = body.category?.trim() || "other";

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!subject || subject.length < 3 || subject.length > 200) {
    return NextResponse.json(
      { error: "Subject must be 3–200 characters." },
      { status: 400 }
    );
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return NextResponse.json(
      { error: "Message must be 10–5000 characters." },
      { status: 400 }
    );
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  // Look up signed-in user (so we can stamp user_id), then insert with
  // the service-role client. The route does all its own validation +
  // honeypot, so bypassing RLS here is intentional — the alternative is
  // granting INSERT on this table to the anon role, which we don't want
  // since this is a public form open to abuse.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_enquiries")
    .insert({
      user_id: user?.id ?? null,
      name,
      email,
      phone: body.phone?.trim() || null,
      category,
      subject,
      message,
      chat_context: body.chatContext?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget the two emails. If Resend isn't configured yet, the
  // calls no-op gracefully; if delivery fails, we still return success
  // because the enquiry IS saved in the DB and admins will see it via
  // the in-app notification.
  await Promise.all([
    sendEmail({
      to: email,
      ...emails.enquiryAck(name, subject),
    }),
    sendEmail({
      to: SUPPORT_INBOX,
      replyTo: email, // hitting reply in Gmail goes back to the user
      ...emails.enquiryToSupport({
        name,
        email,
        phone: body.phone?.trim() || null,
        category,
        subject,
        message,
        chatContext: body.chatContext?.trim() || null,
      }),
    }),
  ]);

  return NextResponse.json({ ok: true, id: data.id });
}
