import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/auth/onboarding
//
// Called by the /welcome page after a user (typically a Google OAuth signup,
// since password signups already collected these at register-time) picks
// their role + provides a phone number. Sellers also pick individual vs
// business as a soft-classification before they reach KYC.
//
// Uses the admin client to bypass RLS for the role change. The RLS policy
// on profiles (`role = (SELECT role FROM profiles WHERE id = auth.uid())`)
// blocks self-modification of the role to prevent privilege escalation to
// admin/logistics. We replicate that intent here in code: this endpoint
// will ONLY accept the values "buyer" or "seller" — never admin or
// logistics — so a malicious caller can't escalate beyond what the regular
// register form allows.
export async function POST(request: Request) {
  // 1. Identify the caller via their session (uses anon client + cookies)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const role = body?.role;
  const phoneRaw: string | undefined = body?.phone;
  const sellerType: string | undefined = body?.seller_type;

  // 2. Hard whitelist of role values — buyer/seller only. NEVER admin or
  // logistics, regardless of what the caller sends.
  if (role !== "buyer" && role !== "seller") {
    return NextResponse.json(
      { error: "Role must be 'buyer' or 'seller'." },
      { status: 400 }
    );
  }

  const phone = (phoneRaw ?? "").replace(/\s/g, "");
  if (!/^(\+?234|0)[789]\d{9}$/.test(phone)) {
    return NextResponse.json(
      { error: "Enter a valid Nigerian phone number." },
      { status: 400 }
    );
  }

  // 3. Seller type — only honored when role === 'seller', validated.
  let sellerTypeValue: "individual" | "business" | null = null;
  if (role === "seller") {
    if (sellerType !== "individual" && sellerType !== "business") {
      return NextResponse.json(
        { error: "Pick 'Individual' or 'Business' as your seller type." },
        { status: 400 }
      );
    }
    sellerTypeValue = sellerType;
  }

  // 4. Service-role update, scoped to the caller's own row only. RLS would
  // block this update because of the anti-elevation WITH CHECK clause on
  // profiles; bypassing RLS here is safe because we validated above.
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      role,
      phone,
      seller_type: sellerTypeValue,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, role });
}
