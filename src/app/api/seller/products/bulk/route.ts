import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type IncomingRow = {
  name: string;
  description?: string;
  price_naira: number;
  stock: number;
  category_slug: string;
};

// POST /api/seller/products/bulk { rows: IncomingRow[] }
// Validates against the sellers' approved status, looks up category ids
// by slug, then batch-inserts products in 'draft' state so the seller
// can review + add media before publishing.
// Returns: { created: number, errors: [{ index, error }] }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only approved sellers may publish products. We still let them upload
  // drafts; publishing happens via the existing seller products edit flow.
  const { data: seller } = await supabase
    .from("sellers")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!seller) {
    return NextResponse.json(
      { error: "You must complete seller onboarding first." },
      { status: 403 }
    );
  }

  const { rows } = (await request.json()) as { rows: IncomingRow[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided." }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 rows per upload." },
      { status: 400 }
    );
  }

  // Resolve all referenced category slugs in one query
  const slugs = [...new Set(rows.map((r) => r.category_slug).filter(Boolean))];
  const { data: cats } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", slugs);
  const slugToId = new Map((cats || []).map((c) => [c.slug, c.id]));

  const validRows: Array<{
    seller_id: string;
    name: string;
    description: string | null;
    price: number; // kobo
    stock_quantity: number;
    category_id: string;
    status: "draft";
    slug: string;
  }> = [];

  const errors: { index: number; error: string }[] = [];

  rows.forEach((r, i) => {
    if (!r.name?.trim()) {
      errors.push({ index: i, error: "name is required" });
      return;
    }
    const priceKobo = Math.round(Number(r.price_naira) * 100);
    if (!Number.isFinite(priceKobo) || priceKobo <= 0) {
      errors.push({ index: i, error: "price_naira must be a positive number" });
      return;
    }
    const stock = Number(r.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      errors.push({ index: i, error: "stock must be a non-negative number" });
      return;
    }
    const categoryId = slugToId.get(r.category_slug);
    if (!categoryId) {
      errors.push({
        index: i,
        error: `Unknown category_slug "${r.category_slug}"`,
      });
      return;
    }

    const slug =
      r.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) +
      "-" +
      Math.random().toString(36).slice(2, 8);

    validRows.push({
      seller_id: user.id,
      name: r.name.trim(),
      description: r.description?.trim() || null,
      price: priceKobo,
      stock_quantity: stock,
      category_id: categoryId,
      status: "draft",
      slug,
    });
  });

  if (validRows.length === 0) {
    return NextResponse.json({ created: 0, errors });
  }

  const { error: insertError } = await supabase
    .from("products")
    .insert(validRows);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message, errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ created: validRows.length, errors });
}
