import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/logistics/contact?shipmentId=...&party=seller|buyer
// Returns the counterparty's name + phone for a shipment so a logistics
// agent can call them. Phone lives on profiles (behind strict RLS), so we
// resolve it server-side with the service-role client after authorizing the
// caller as a logistics user (role or pickups/deliveries permission).
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let allowed = profile?.role === "logistics";
  if (!allowed) {
    const [{ data: p1 }, { data: p2 }] = await Promise.all([
      supabase.rpc("has_permission", { perm: "pickups.manage" }),
      supabase.rpc("has_permission", { perm: "deliveries.manage" }),
    ]);
    allowed = p1 === true || p2 === true;
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const shipmentId = url.searchParams.get("shipmentId");
  const party = url.searchParams.get("party");
  if (!shipmentId || (party !== "seller" && party !== "buyer")) {
    return NextResponse.json(
      { error: "shipmentId and party (seller|buyer) are required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: shipment } = await admin
    .from("shipments")
    .select("order_id")
    .eq("id", shipmentId)
    .single();
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  const { data: order } = await admin
    .from("orders")
    .select("seller_id, buyer_id")
    .eq("id", shipment.order_id)
    .single();
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const targetId = party === "seller" ? order.seller_id : order.buyer_id;
  const { data: target } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", targetId)
    .single();

  let name = target?.full_name ?? "Contact";
  if (party === "seller") {
    const { data: seller } = await admin
      .from("sellers")
      .select("business_name")
      .eq("id", targetId)
      .single();
    if (seller?.business_name) name = seller.business_name;
  }

  return NextResponse.json({ name, phone: target?.phone ?? null });
}
