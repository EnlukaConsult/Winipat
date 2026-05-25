import { NextResponse } from "next/server";

// Vercel Cron sends Authorization: Bearer <CRON_SECRET> on scheduled invocations.
// Reject anything else so the routes can't be triggered by random traffic.
export function verifyCron(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
