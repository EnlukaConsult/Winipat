import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protected route prefixes. Use exact-or-followed-by-slash matching so
  // the prefix /seller doesn't accidentally match /sellers/<id> (public).
  const protectedPaths = ["/dashboard", "/seller", "/admin", "/logistics"];
  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Role-based access — only check when authed (a single profiles
  // query per request; cheap and avoids leaking admin UI to non-admins).
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role || "buyer";

    // Admins are restricted to /admin/* — they were previously allowed
    // everywhere, but that caused brand confusion: admin sidebar +
    // buyer page content side-by-side. If admin needs to inspect a
    // specific product, use the admin-side tools in /admin (or paste
    // the URL into a private window as a regular buyer).
    const isAllowed =
      (role === "admin"     && path.startsWith("/admin")) ||
      (role === "seller"    && (path.startsWith("/seller")    || path.startsWith("/dashboard"))) ||
      (role === "buyer"     && path.startsWith("/dashboard")) ||
      (role === "logistics" && (path.startsWith("/logistics") || path.startsWith("/dashboard")));

    if (!isAllowed) {
      const url = request.nextUrl.clone();
      url.pathname =
        role === "admin"     ? "/admin"             :
        role === "seller"    ? "/seller"            :
        role === "logistics" ? "/logistics/pickups" :
                               "/dashboard/browse";
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from auth pages. Use the same
  // role-based landing logic as above so admins go to /admin, not
  // /dashboard/browse.
  const authPaths = ["/login", "/register"];
  const isAuthPage = authPaths.some((p) => path.startsWith(p));

  if (isAuthPage && user) {
    // Look up role to send them to the right landing page
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role || "buyer";
    const url = request.nextUrl.clone();
    url.pathname =
      role === "admin"     ? "/admin"             :
      role === "seller"    ? "/seller"            :
      role === "logistics" ? "/logistics/pickups" :
                             "/dashboard/browse";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
