import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Only allow relative redirects to prevent open-redirect attacks
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }

    // Exchange failed — send user to login with an error hint
    return NextResponse.redirect(
      `${origin}/login?error=confirmation_failed`
    );
  }

  // No code present — malformed link
  return NextResponse.redirect(
    `${origin}/login?error=missing_code`
  );
}
