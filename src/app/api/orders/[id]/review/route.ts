import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rating, comment } = await request.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  // Verify order is completed and belongs to buyer
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .eq("status", "completed")
    .single();

  if (!order) {
    return NextResponse.json(
      { error: "Order not found or not eligible for review" },
      { status: 404 }
    );
  }

  // Check if already reviewed
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("order_id", orderId)
    .single();

  if (existingReview) {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  // Create review
  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    buyer_id: user.id,
    seller_id: order.seller_id,
    rating,
    comment: comment || null,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }

  // Update seller trust score
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("seller_id", order.seller_id);

  if (reviews) {
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await supabase
      .from("trust_scores")
      .upsert({
        seller_id: order.seller_id,
        average_rating: Math.round(avgRating * 10) / 10,
        total_reviews: reviews.length,
        updated_at: new Date().toISOString(),
      })
      .eq("seller_id", order.seller_id);
  }

  return NextResponse.json({ success: true });
}
