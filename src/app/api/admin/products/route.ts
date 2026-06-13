import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-guard";

// GET - list products pending review
export async function GET() {
  const guard = await requirePermission("products.moderate");
  if (guard instanceof NextResponse) return guard;

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, price, stock_quantity, status, description, created_at, categories(name), sellers(business_name), product_media(file_url, media_type)")
    .in("status", ["paused", "active", "draft"])
    .order("created_at", { ascending: false });

  return NextResponse.json({ products: products || [] });
}

// PATCH - approve/reject product
export async function PATCH(req: Request) {
  const guard = await requirePermission("products.moderate");
  if (guard instanceof NextResponse) return guard;

  const supabase = await createClient();

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
      admin_id: guard.user.id,
      action_type: `product_${action}`,
      target_type: "product",
      target_id: productId,
      notes: notes || null,
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
