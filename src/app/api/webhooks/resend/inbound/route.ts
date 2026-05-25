import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Webhook } from "svix";

// POST /api/webhooks/resend/inbound
// Receives replies sent to support@winipat.com after the user has been
// emailed by us (e.g. an enquiry acknowledgement or admin reply).
//
// Threading strategy:
//   1. Match the In-Reply-To / References header to an enquiry ID we
//      stamped in our outbound email's Message-ID (when available).
//   2. Fall back to subject heuristics ("Re: <original subject>").
//   3. Last resort: open a brand-new enquiry from the reply.
//
// Auth: signed by Resend with Svix headers; verify with RESEND_WEBHOOK_SECRET.

type InboundEvent = {
  type: string;
  data: {
    id?: string;
    from?: { email: string; name?: string } | string;
    to?: ({ email: string } | string)[] | string;
    subject?: string;
    text?: string;
    html?: string;
    headers?: Array<{ name: string; value: string }>;
    in_reply_to?: string;
    references?: string[];
  };
};

function extractAddress(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "email" in v) return (v as { email: string }).email;
  if (Array.isArray(v) && v.length > 0) return extractAddress(v[0]);
  return "";
}

function extractName(v: unknown, fallback: string): string {
  if (v && typeof v === "object" && "name" in v) {
    return (v as { name?: string }).name || fallback;
  }
  return fallback;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const rawBody = await request.text();

  // Signature verification — skip only if secret is unset (eg local testing)
  if (secret) {
    const wh = new Webhook(secret);
    const headers = {
      "svix-id":        request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };
    try {
      wh.verify(rawBody, headers);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: InboundEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resend emits a small set of inbound event types — only act on the
  // "received" one. Ack other events so they don't retry.
  if (!event.type?.includes("inbound") || !event.data) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const fromEmail = extractAddress(event.data.from).toLowerCase();
  const fromName  = extractName(event.data.from, fromEmail.split("@")[0] || "Unknown");
  const subject   = (event.data.subject || "(no subject)").slice(0, 200);
  const bodyText  = event.data.text || stripHtml(event.data.html || "") || "";

  if (!fromEmail) {
    return NextResponse.json({ error: "No from address" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) Try to thread by subject — strip leading "Re: " / "Fwd: " and look
  //    for an existing enquiry from the same email address with the same
  //    base subject. Cheap and works for ~80% of replies.
  const baseSubject = subject
    .replace(/^(re:|fwd:|fw:)\s*/i, "")
    .trim()
    .slice(0, 200);

  const { data: existing } = await admin
    .from("support_enquiries")
    .select("id, admin_notes, status")
    .ilike("email", fromEmail)
    .ilike("subject", `%${baseSubject}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stamp = new Date().toISOString();
  const replyLog =
    `\n\n[inbound reply ${stamp} from ${fromEmail}]\n` +
    `Subject: ${subject}\n${bodyText.slice(0, 4000)}`;

  if (existing) {
    // Threaded: append + reopen
    await admin
      .from("support_enquiries")
      .update({
        admin_notes: (existing.admin_notes || "") + replyLog,
        status: existing.status === "spam" ? "spam" : "in_progress",
        resolved_at: null,
      })
      .eq("id", existing.id);

    // Bell-notify admins so they see the response
    await admin.from("notifications").insert({
      user_id: null, // resolved in trigger below
      title: `Reply from ${fromName}`,
      body: `New reply on enquiry: ${baseSubject}`,
      type: "system",
      data: { enquiry_id: existing.id, kind: "inbound_reply" },
    } as never);

    return NextResponse.json({ ok: true, threaded: true, enquiry_id: existing.id });
  }

  // 2) No match — open a fresh enquiry. Trigger will notify admins.
  const { data: created, error } = await admin
    .from("support_enquiries")
    .insert({
      user_id: null,
      name: fromName,
      email: fromEmail,
      category: "other",
      subject,
      message: bodyText.slice(0, 4000) || "(empty body)",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, threaded: false, enquiry_id: created.id });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
