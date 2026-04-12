import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items, deliveryMode, logisticsPartnerId, deliveryAddressId, logisticsFee } =
    await request.json();

  if (!items?.length) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  // Validate products and calculate totals
  const productIds = items.map((i: { productId: string }) => i.productId);
  const { data: products } = await supabase
    .from("products")
    .select("id, seller_id, name, price, stock_quantity, status")
    .in("id", productIds)
    .eq("status", "active");

  if (!products || products.length !== items.length) {
    return NextResponse.json(
      { error: "Some products are unavailable" },
      { status: 400 }
    );
  }

  // All items must be from the same seller (V1 constraint)
  const sellerIds = [...new Set(products.map((p) => p.seller_id))];
  if (sellerIds.length > 1) {
    return NextResponse.json(
      { error: "All items must be from the same seller" },
      { status: 400 }
    );
  }

  const sellerId = sellerIds[0];
  const orderNumber = `WNP-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  let subtotal = 0;
  const orderItems = items.map(
    (item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!;
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      return {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
      };
    }
  );

  const platformFee = 0; // Free for buyers in V1
  const total = subtotal + (logisticsFee || 0) + platformFee;

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      seller_id: sellerId,
      order_number: orderNumber,
      status: "pending_payment",
      subtotal,
      logistics_fee: logisticsFee || 0,
      platform_fee: platformFee,
      total,
      delivery_mode: deliveryMode || "door_to_door",
      logistics_partner_id: logisticsPartnerId || null,
      delivery_address_id: deliveryAddressId || null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }

  // Insert order items
  await supabase.from("order_items").insert(
    orderItems.map((item: { product_id: string; product_name: string; product_price: number; quantity: number }) => ({
      ...item,
      order_id: order.id,
    }))
  );

  // Create initial status history
  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status: "pending_payment",
    changed_by: user.id,
    notes: "Order created",
  });

  // Clear cart
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (cart) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }

  // Notify seller
  await supabase.from("notifications").insert({
    user_id: sellerId,
    title: "New Order Pending",
    body: `Order ${orderNumber} is awaiting payment.`,
    type: "order",
    data: { order_id: order.id },
  });

  return NextResponse.json({ orderId: order.id, orderNumber });
}
