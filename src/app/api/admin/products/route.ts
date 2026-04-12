import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - list products pending review
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, price, stock_quantity, status, description, created_at, categories(name), sellers(business_name), product_media(file_url, media_type)")
    .in("status", ["paused", "active", "draft"])
    .order("created_at", { ascending: false });

  return NextResponse.json({ products: products || [] });
}

// PATCH - approve/reject product
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { productId, action, notes } = await req.json();

  if (!productId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "active" : "removed";

  await supabase
    .from("products")
    .update({ status: newStatus })
    .eq("id", productId);

  // Get product details for notification
  const { data: product } = await supabase
    .from("products")
    .select("name, seller_id")
    .eq("id", productId)
    .single();

  if (product) {
    await supabase.from("notifications").insert({
      user_id: product.seller_id,
      title: action === "approve" ? "Product Approved!" : "Product Rejected",
      body: action === "approve"
        ? `"${product.name}" has been approved and is now live on Winipat.`
        : `"${product.name}" was not approved. ${notes || "Please review and resubmit."}`,
      type: "product",
      data: { product_id: productId },
    });

    // Log admin action
    await supabase.from("admin_actions").insert({
      admin_id: user.id,
      action_type: `product_${action}`,
      target_type: "product",
      target_id: productId,
      notes: notes || null,
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
