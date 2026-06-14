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

  // Stock guard: reject if any requested quantity is invalid or exceeds the
  // available stock (prevents overselling — Bug 5).
  for (const item of items as { productId: string; quantity: number }[]) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return NextResponse.json(
        { error: "Invalid quantity." },
        { status: 400 }
      );
    }
    if (item.quantity > product.stock_quantity) {
      return NextResponse.json(
        {
          error: `Only ${product.stock_quantity} of "${product.name}" left in stock.`,
        },
        { status: 400 }
      );
    }
  }

  // Multi-vendor checkout: one order per seller (Bug 2). Group items by the
  // product's seller, then create an order per group. The single delivery fee
  // is charged once (on the first seller's order) so the grand total still
  // equals the one-fee checkout total; each seller gets its own order + escrow.
  const itemsBySeller = new Map<string, { productId: string; quantity: number }[]>();
  for (const item of items as { productId: string; quantity: number }[]) {
    const product = products.find((p) => p.id === item.productId)!;
    const list = itemsBySeller.get(product.seller_id) ?? [];
    list.push(item);
    itemsBySeller.set(product.seller_id, list);
  }

  const platformFee = 0; // Free for buyers in V1
  const orderIds: string[] = [];
  let sellerIndex = 0;

  for (const [sellerId, sellerItems] of itemsBySeller) {
    const orderNumber = `WNP-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    let subtotal = 0;
    const orderItems = sellerItems.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      subtotal += product.price * item.quantity;
      return {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
      };
    });

    const orderLogisticsFee = sellerIndex === 0 ? logisticsFee || 0 : 0;
    const total = subtotal + orderLogisticsFee + platformFee;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        order_number: orderNumber,
        status: "pending_payment",
        subtotal,
        logistics_fee: orderLogisticsFee,
        platform_fee: platformFee,
        total,
        delivery_mode: deliveryMode || "door_to_door",
        logistics_partner_id: logisticsPartnerId || null,
        delivery_address_id: deliveryAddressId || null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    await supabase
      .from("order_items")
      .insert(orderItems.map((it) => ({ ...it, order_id: order.id })));

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: "pending_payment",
      changed_by: user.id,
      notes: "Order created",
    });

    await supabase.from("notifications").insert({
      user_id: sellerId,
      title: "New Order Pending",
      body: `Order ${orderNumber} is awaiting payment.`,
      type: "order",
      data: { order_id: order.id },
    });

    orderIds.push(order.id);
    sellerIndex++;
  }

  // Clear cart once for the whole checkout.
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (cart) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }

  // orderId kept for backward compatibility (single-seller carts).
  return NextResponse.json({ orderIds, orderId: orderIds[0] });
}
