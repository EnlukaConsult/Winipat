import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - fetch cart items
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get or create cart
  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!cart) {
    const { data: newCart } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    cart = newCart;
  }

  if (!cart) return NextResponse.json({ items: [] });

  // Get cart items with product details
  const { data: items } = await supabase
    .from("cart_items")
    .select("id, quantity, product_id, products(id, name, slug, price, stock_quantity, product_media(file_url), sellers(business_name), categories(name))")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ items: items || [] });
}

// POST - add item to cart
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, quantity = 1 } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  // Get or create cart
  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!cart) {
    const { data: newCart } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    cart = newCart;
  }

  if (!cart) return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });

  // Check if item already in cart
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .single();

  if (existing) {
    // Update quantity
    await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
  } else {
    // Insert new item
    await supabase
      .from("cart_items")
      .insert({ cart_id: cart.id, product_id: productId, quantity });
  }

  return NextResponse.json({ success: true });
}

// DELETE - remove item from cart
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  await supabase.from("cart_items").delete().eq("id", itemId);
  return NextResponse.json({ success: true });
}

// PATCH - update quantity
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId, quantity } = await req.json();
  if (!itemId || quantity < 1) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
  return NextResponse.json({ success: true });
}
