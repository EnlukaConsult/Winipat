import { Resend } from "resend";

// Centralised email sender. All outbound mail goes through here so we can
// swap providers, add logging, or rate-limit in one place. Returns
// { ok: true, id } on success, { ok: false, error } on failure — we
// never throw, because a failed email shouldn't break user flows
// (signup, payouts, etc. should still succeed even if the notification
// email can't be delivered).

const FROM_DEFAULT  = process.env.RESEND_FROM_EMAIL  || "Winipat <support@winipat.com>";
const REPLY_TO      = process.env.RESEND_REPLY_TO    || "support@winipat.com";
const SUPPORT_INBOX = process.env.WINIPAT_SUPPORT_EMAIL || "support@winipat.com";

let cached: Resend | null = null;
function client(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;       // plain-text fallback (highly recommended for deliverability)
  replyTo?: string;
  from?: string;
};

export async function sendEmail(
  args: SendArgs
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const c = client();
  if (!c) {
    return { ok: false, error: "RESEND_API_KEY not set — email skipped" };
  }
  try {
    const { data, error } = await c.emails.send({
      from: args.from || FROM_DEFAULT,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo || REPLY_TO,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id || "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown send error" };
  }
}

// ---------------------------------------------------------------------------
// Reusable HTML shell. Keeps headers / footers / branding consistent across
// every transactional email so we look like one company, not five scripts.
// ---------------------------------------------------------------------------
function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Inter,Arial,sans-serif;color:#0B1020;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#7C3AED,#3C4FE0);color:#fff;">
                <p style="margin:0;font-weight:700;font-size:18px;letter-spacing:0.2px;">Winipat</p>
                <p style="margin:4px 0 0 0;font-size:12px;opacity:0.85;">Trust-first commerce for Nigeria</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#334155;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#F1F5F9;font-size:12px;color:#64748B;text-align:center;border-top:1px solid #E2E8F0;">
                Questions? Reply to this email or visit
                <a href="https://winipat.com/contact" style="color:#3C4FE0;text-decoration:none;">winipat.com/contact</a>
                <br />
                <span style="opacity:0.7;">&copy; ${new Date().getFullYear()} Winipat. All rights reserved.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const emails = {
  /** Sent to the visitor who submitted the contact form. */
  enquiryAck: (toName: string, subject: string) => ({
    subject: `We received your message — Winipat support`,
    text:
      `Hi ${toName},\n\n` +
      `Thanks for reaching out to Winipat support. We've logged your message ("${subject}") ` +
      `and a member of our team will reply within one business day.\n\n` +
      `If you need to add more context, just reply to this email.\n\n` +
      `— Winipat Support`,
    html: shell(
      "We received your message",
      `<h2 style="margin:0 0 14px 0;font-size:18px;color:#0B1020;">Hi ${escapeHtml(toName)},</h2>
       <p>Thanks for reaching out to Winipat support. We&apos;ve logged your message and a member of our team will reply within <strong>one business day</strong>.</p>
       <p style="background:#F1F5F9;padding:12px 14px;border-radius:8px;font-size:13px;color:#334155;">
         <strong>Subject:</strong> ${escapeHtml(subject)}
       </p>
       <p>If you need to add anything, just reply to this email — your reply lands in the same support thread.</p>`
    ),
  }),

  /** Sent to support@winipat.com when a new enquiry is submitted. */
  enquiryToSupport: (params: {
    name: string;
    email: string;
    phone: string | null;
    category: string;
    subject: string;
    message: string;
    chatContext?: string | null;
  }) => ({
    subject: `[Enquiry · ${params.category}] ${params.subject}`,
    text:
      `From: ${params.name} <${params.email}>\n` +
      (params.phone ? `Phone: ${params.phone}\n` : "") +
      `Category: ${params.category}\n` +
      `Subject: ${params.subject}\n\n` +
      `${params.message}\n\n` +
      (params.chatContext ? `--- Chat context ---\n${params.chatContext}\n` : ""),
    html: shell(
      "New support enquiry",
      `<h2 style="margin:0 0 14px 0;font-size:18px;">New support enquiry</h2>
       <table style="font-size:13px;color:#334155;border-collapse:collapse;">
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">From</td><td>${escapeHtml(params.name)} &lt;${escapeHtml(params.email)}&gt;</td></tr>
         ${params.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Phone</td><td>${escapeHtml(params.phone)}</td></tr>` : ""}
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Category</td><td>${escapeHtml(params.category)}</td></tr>
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Subject</td><td>${escapeHtml(params.subject)}</td></tr>
       </table>
       <hr style="border:none;border-top:1px solid #E2E8F0;margin:18px 0;" />
       <p style="white-space:pre-wrap;">${escapeHtml(params.message)}</p>
       ${
         params.chatContext
           ? `<details><summary style="cursor:pointer;color:#7C3AED;">Chat transcript</summary>
              <pre style="background:#F1F5F9;padding:12px;border-radius:8px;font-size:11px;white-space:pre-wrap;">${escapeHtml(params.chatContext)}</pre>
              </details>`
           : ""
       }
       <p style="margin-top:18px;">
         <a href="https://winipat.com/admin/enquiries" style="background:#3C4FE0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open in admin</a>
       </p>`
    ),
  }),

  /** Sent when an admin replies via /admin/enquiries (replaces mailto). */
  adminReply: (params: {
    toName: string;
    originalSubject: string;
    replyBody: string;
    adminName: string;
  }) => ({
    subject: `Re: ${params.originalSubject}`,
    text:
      `Hi ${params.toName},\n\n${params.replyBody}\n\n` +
      `— ${params.adminName}, Winipat Support`,
    html: shell(
      `Re: ${params.originalSubject}`,
      `<p>Hi ${escapeHtml(params.toName)},</p>
       <div style="white-space:pre-wrap;">${escapeHtml(params.replyBody)}</div>
       <p style="margin-top:18px;color:#334155;">
         — ${escapeHtml(params.adminName)}<br />
         <span style="color:#94A3B8;font-size:12px;">Winipat Support</span>
       </p>`
    ),
  }),

  /** Sent when an admin marks a payout as completed. */
  payoutCompleted: (params: {
    toName: string;
    amountNaira: number;
    reference: string;
    orderNumber?: string;
  }) => ({
    subject: `Payout sent — NGN ${params.amountNaira.toLocaleString()}`,
    text:
      `Hi ${params.toName},\n\n` +
      `Your payout of NGN ${params.amountNaira.toLocaleString()} has been sent ` +
      `${params.orderNumber ? `for order ${params.orderNumber}` : ""}. ` +
      `Reference: ${params.reference}.\n\n` +
      `— Winipat`,
    html: shell(
      "Payout sent",
      `<p>Hi ${escapeHtml(params.toName)},</p>
       <p>We&apos;ve sent <strong>NGN ${params.amountNaira.toLocaleString()}</strong> to your registered bank account.</p>
       <table style="font-size:13px;color:#334155;border-collapse:collapse;">
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Reference</td><td><code>${escapeHtml(params.reference)}</code></td></tr>
         ${params.orderNumber ? `<tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Order</td><td>${escapeHtml(params.orderNumber)}</td></tr>` : ""}
       </table>
       <p>If you don&apos;t see the funds within 24 hours, reply to this email and we&apos;ll investigate.</p>`
    ),
  }),

  /** Sent to buyer when an order is placed + paid. */
  orderPlaced: (params: {
    toName: string;
    orderNumber: string;
    sellerName: string;
    totalNaira: number;
    deliveryEta?: string;
  }) => ({
    subject: `Order ${params.orderNumber} placed — payment held in escrow`,
    text:
      `Hi ${params.toName},\n\n` +
      `Your order ${params.orderNumber} for NGN ${params.totalNaira.toLocaleString()} ` +
      `from ${params.sellerName} has been placed and your payment is held in escrow.\n\n` +
      `${params.sellerName} has 24 hours to accept. ${params.deliveryEta ? `Estimated delivery: ${params.deliveryEta}.` : ""}\n\n` +
      `Track at: https://winipat.com/dashboard/orders\n\n` +
      `— Winipat`,
    html: shell(
      "Order placed",
      `<p>Hi ${escapeHtml(params.toName)},</p>
       <p>Your order is in. Your payment of <strong>NGN ${params.totalNaira.toLocaleString()}</strong> is held in escrow until you confirm delivery.</p>
       <table style="font-size:13px;color:#334155;border-collapse:collapse;">
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Order</td><td><code>${escapeHtml(params.orderNumber)}</code></td></tr>
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Seller</td><td>${escapeHtml(params.sellerName)}</td></tr>
         ${params.deliveryEta ? `<tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">ETA</td><td>${escapeHtml(params.deliveryEta)}</td></tr>` : ""}
       </table>
       <p>The seller has 24 hours to accept and prepare. You&apos;ll get an email at each major step.</p>
       <p style="margin-top:18px;">
         <a href="https://winipat.com/dashboard/orders" style="background:#3C4FE0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Track your order</a>
       </p>`
    ),
  }),

  /** Sent to seller when a buyer pays — gives them 24h to accept. */
  newOrderForSeller: (params: {
    toName: string;
    orderNumber: string;
    buyerName: string;
    totalNaira: number;
  }) => ({
    subject: `New order ${params.orderNumber} — accept within 24h`,
    text:
      `Hi ${params.toName},\n\n` +
      `${params.buyerName} just placed order ${params.orderNumber} (NGN ${params.totalNaira.toLocaleString()}).\n\n` +
      `Accept within 24 hours via your seller dashboard. Missed-accept SLA: order auto-cancels.\n\n` +
      `https://winipat.com/seller/orders\n\n— Winipat`,
    html: shell(
      "New paid order",
      `<p>Hi ${escapeHtml(params.toName)},</p>
       <p>A buyer just paid for an order from you.</p>
       <table style="font-size:13px;color:#334155;border-collapse:collapse;">
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Order</td><td><code>${escapeHtml(params.orderNumber)}</code></td></tr>
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Buyer</td><td>${escapeHtml(params.buyerName)}</td></tr>
         <tr><td style="padding:4px 12px 4px 0;color:#94A3B8;">Total</td><td><strong>NGN ${params.totalNaira.toLocaleString()}</strong></td></tr>
       </table>
       <p><strong>Accept within 24 hours</strong> or the order auto-cancels and the buyer is refunded.</p>
       <p style="margin-top:18px;">
         <a href="https://winipat.com/seller/orders" style="background:#3C4FE0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">View order</a>
       </p>`
    ),
  }),

  /** Sent to seller when a buyer opens a dispute. */
  disputeOpened: (params: {
    toSellerName: string;
    orderNumber: string;
    reason: string;
  }) => ({
    subject: `Dispute opened on order ${params.orderNumber}`,
    text:
      `Hi ${params.toSellerName},\n\n` +
      `A buyer opened a dispute on order ${params.orderNumber}. Reason: "${params.reason}".\n\n` +
      `Escrow is frozen. You have 48 hours to respond with your side and any evidence ` +
      `(photos, tracking, packaging) via your seller dashboard.\n\n` +
      `https://winipat.com/seller/disputes\n\n— Winipat`,
    html: shell(
      "Dispute opened",
      `<p>Hi ${escapeHtml(params.toSellerName)},</p>
       <p>A buyer opened a dispute on order <code>${escapeHtml(params.orderNumber)}</code>.</p>
       <p style="background:#FEF2F2;border:1px solid #FCA5A5;color:#7F1D1D;padding:12px 14px;border-radius:8px;font-size:13px;">
         <strong>Reason:</strong> ${escapeHtml(params.reason)}
       </p>
       <p>Escrow is now frozen. <strong>You have 48 hours</strong> to respond with your side and upload any evidence (photos, tracking, packaging proof). After that, our team will review based on what&apos;s submitted.</p>
       <p style="margin-top:18px;">
         <a href="https://winipat.com/seller/disputes" style="background:#3C4FE0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Respond now</a>
       </p>`
    ),
  }),

  /** Sent to both buyer + seller when a dispute resolves. */
  disputeResolved: (params: {
    toName: string;
    orderNumber: string;
    resolution: "release_to_seller" | "full_refund" | "partial_refund";
    refundAmountNaira?: number;
    notes?: string;
    isBuyer: boolean;
  }) => {
    const verdict =
      params.resolution === "release_to_seller"
        ? "released to the seller"
        : params.resolution === "full_refund"
        ? "fully refunded to the buyer"
        : `partially refunded${params.refundAmountNaira ? ` (NGN ${params.refundAmountNaira.toLocaleString()} back to buyer)` : ""}`;

    return {
      subject: `Dispute resolved on order ${params.orderNumber}`,
      text:
        `Hi ${params.toName},\n\n` +
        `The dispute on order ${params.orderNumber} has been resolved: escrow was ${verdict}.\n\n` +
        (params.notes ? `Admin notes: ${params.notes}\n\n` : "") +
        `— Winipat`,
      html: shell(
        "Dispute resolved",
        `<p>Hi ${escapeHtml(params.toName)},</p>
         <p>The dispute on order <code>${escapeHtml(params.orderNumber)}</code> has been resolved.</p>
         <p style="background:#F0FDF4;border:1px solid #86EFAC;color:#14532D;padding:12px 14px;border-radius:8px;font-size:13px;">
           <strong>Outcome:</strong> escrow was ${escapeHtml(verdict)}
         </p>
         ${params.notes ? `<p><strong>Reviewer notes:</strong> ${escapeHtml(params.notes)}</p>` : ""}
         <p>${params.isBuyer
           ? "If a refund was issued, expect it to land in your account within 5-10 working days (depending on your bank)."
           : "If escrow was released, your payout will follow our normal 48-hour batch."}</p>
         <p>Disagree with the outcome? Reply to this email and we&apos;ll have a senior reviewer take another look.</p>`
      ),
    };
  },

  /** Sent to seller when admin approves their KYC. */
  sellerApproved: (toName: string, businessName: string) => ({
    subject: `Your Winipat seller account is approved`,
    text:
      `Hi ${toName},\n\n` +
      `Your seller account "${businessName}" has been approved. ` +
      `You can now list products and receive orders.\n\n` +
      `Sign in: https://winipat.com/login\n\n` +
      `— Winipat`,
    html: shell(
      "You're approved",
      `<h2 style="margin:0 0 14px 0;font-size:18px;">Welcome to Winipat, ${escapeHtml(toName)}!</h2>
       <p>Your seller account <strong>${escapeHtml(businessName)}</strong> has been approved.</p>
       <p>You can now list products and start receiving orders. Buyers will see your trust badge as your sales grow.</p>
       <p style="margin-top:18px;">
         <a href="https://winipat.com/seller" style="background:#3C4FE0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open your dashboard</a>
       </p>`
    ),
  }),
};

export { SUPPORT_INBOX };
