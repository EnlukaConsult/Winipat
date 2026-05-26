import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/onboarding
//
// Called by the /welcome page after a user (typically a Google OAuth signup,
// since password signups already collected these at register-time) chooses
// their role and provides a phone number. Updates the profile row so the
// dashboards have the data they need, then the page routes the user to the
// correct landing.
//
// Security: uses the user's own session to identify them — they can only
// patch their own profile row (RLS enforces this anyway).
export async function POST(request: Request) {
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

  const { error } = await supabase
    .from("profiles")
    .update({ role, phone })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, role });
}
