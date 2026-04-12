import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - list seller's products
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, price, stock_quantity, status, created_at, categories(name), product_media(file_url, media_type, display_order)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ products: products || [] });
}

// POST - create new product
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user is an approved seller
  const { data: seller } = await supabase
    .from("sellers")
    .select("id, status")
    .eq("id", user.id)
    .single();

  if (!seller || seller.status !== "approved") {
    return NextResponse.json(
      { error: "You must be an approved seller to list products. Complete your seller onboarding first." },
      { status: 403 }
    );
  }

  const { name, description, categoryId, price, stockQuantity, imageUrls, videoUrl, status } = await req.json();

  // Validation
  if (!name?.trim()) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });
  if (!categoryId) return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!price || price <= 0) return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
  if (!stockQuantity || stockQuantity <= 0) return NextResponse.json({ error: "Stock quantity is required" }, { status: 400 });

  // Create slug
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80)
    + "-" + Date.now().toString(36);

  // Price in kobo
  const priceInKobo = Math.round(price * 100);

  // Product status: sellers submit for review, admin approves
  const productStatus = status === "draft" ? "draft" : "paused";

  // Insert product
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      seller_id: user.id,
      category_id: categoryId,
      name: name.trim(),
      slug,
      description: description.trim(),
      price: priceInKobo,
      stock_quantity: stockQuantity,
      status: productStatus,
    })
    .select("id")
    .single();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  // Insert product media (images)
  if (imageUrls?.length > 0) {
    const mediaRows = imageUrls.map((url: string, i: number) => ({
      product_id: product.id,
      file_url: url,
      media_type: "image",
      display_order: i,
    }));

    await supabase.from("product_media").insert(mediaRows);
  }

  // Insert video if provided
  if (videoUrl) {
    await supabase.from("product_media").insert({
      product_id: product.id,
      file_url: videoUrl,
      media_type: "video",
      display_order: 99,
    });
  }

  // Notify admin about new product for review
  await supabase.from("notifications").insert({
    user_id: user.id,
    title: productStatus === "draft" ? "Product Saved as Draft" : "Product Submitted for Review",
    body: productStatus === "draft"
      ? `"${name}" saved as draft. Submit for review when ready.`
      : `"${name}" has been submitted and is pending admin approval.`,
    type: "product",
    data: { product_id: product.id },
  });

  return NextResponse.json({
    productId: product.id,
    status: productStatus,
    message: productStatus === "draft"
      ? "Product saved as draft"
      : "Product submitted for review. Our team will approve it shortly.",
  });
}

// PATCH - update product
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, ...updates } = await req.json();

  // Verify ownership
  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .eq("seller_id", user.id)
    .single();

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (updates.name) updateData.name = updates.name;
  if (updates.description) updateData.description = updates.description;
  if (updates.categoryId) updateData.category_id = updates.categoryId;
  if (updates.price) updateData.price = Math.round(updates.price * 100);
  if (updates.stockQuantity !== undefined) updateData.stock_quantity = updates.stockQuantity;
  if (updates.status === "paused") updateData.status = "paused";

  await supabase.from("products").update(updateData).eq("id", productId);

  return NextResponse.json({ success: true });
}

// DELETE - delete product
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();

  // Delete media first, then product
  await supabase.from("product_media").delete().eq("product_id", productId);
  await supabase.from("products").delete().eq("id", productId).eq("seller_id", user.id);

  return NextResponse.json({ success: true });
}
