import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNaira, formatDate } from "@/lib/utils";
import { Star, ShieldCheck, MapPin, Package, AlertCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// Public seller storefront — no auth required. Visible to anyone with
// the URL. Shows business info, trust score, recent reviews, active
// products. Used as the canonical "seller reputation" surface.
export const dynamic = "force-dynamic";

export default async function PublicSellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: seller } = await supabase
    .from("sellers")
    .select(
      `id, business_name, description, pickup_city, pickup_state, status, created_at,
       trust:trust_scores(average_rating, total_reviews, dispute_rate, on_time_rate, badge)`
    )
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (!seller) return notFound();

  const trust = Array.isArray(seller.trust) ? seller.trust[0] : seller.trust;

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, product_media(file_url)")
    .eq("seller_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(12);

  // Two-pass review fetch — the inline `buyer:profiles!buyer_id` join
  // returns null because the profiles RLS blocks cross-user reads.
  // Instead pull reviews first, then look up the reviewer's display
  // name from the public_profiles view (migration 012, GRANT to both
  // anon + authenticated so public storefronts work too).
  const { data: rawReviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, buyer_id")
    .eq("seller_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  type RawReview = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    buyer_id: string;
  };
  const reviewRows = (rawReviews as RawReview[] | null) ?? [];

  let buyerNames: Record<string, string | null> = {};
  if (reviewRows.length > 0) {
    const reviewerIds = Array.from(new Set(reviewRows.map((r) => r.buyer_id)));
    const { data: profileRows } = await supabase
      .from("public_profiles")
      .select("id, full_name")
      .in("id", reviewerIds);
    buyerNames = Object.fromEntries(
      ((profileRows as Array<{ id: string; full_name: string | null }> | null) ?? [])
        .map((p) => [p.id, p.full_name])
    );
  }

  const reviews = reviewRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    buyer: { full_name: buyerNames[r.buyer_id] ?? "Verified buyer" },
  }));

  const rating = trust?.average_rating ? Number(trust.average_rating) : 0;
  const totalReviews = trust?.total_reviews ?? 0;
  const onTime = trust?.on_time_rate ? Number(trust.on_time_rate) : 0;
  const disputeRate = trust?.dispute_rate ? Number(trust.dispute_rate) : 0;

  return (
    <div className="min-h-dvh bg-cloud">
      <header className="bg-white border-b border-mist">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-violet font-[family-name:var(--font-sora)]">
            Winipat
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs text-slate hover:text-violet">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-xs px-3 py-1.5 rounded-full bg-violet text-white hover:bg-violet-dark"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <Card padding="md" className="bg-gradient-to-r from-midnight to-violet-dark text-white border-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold shrink-0">
                {seller.business_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold font-[family-name:var(--font-sora)]">
                  {seller.business_name}
                </h1>
                <p className="text-sm text-white/70 mt-1 flex items-center gap-1.5">
                  <MapPin size={13} />
                  {seller.pickup_city || "—"}, {seller.pickup_state || "—"}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  On Winipat since {formatDate(seller.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant="gold" className="text-xs">
                <ShieldCheck size={12} className="mr-1" />
                Verified
              </Badge>
              {trust?.badge && (
                <Badge variant="success" className="text-[10px] capitalize">
                  {trust.badge.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>

          {seller.description && (
            <p className="mt-4 text-sm text-white/80 leading-relaxed">
              {seller.description}
            </p>
          )}
        </Card>

        {/* Trust stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-lighter uppercase">Rating</p>
            <p className="text-2xl font-bold text-midnight mt-1 font-[family-name:var(--font-sora)]">
              {rating.toFixed(1)}
              <Star className="inline ml-1 text-gold" size={20} fill="currentColor" />
            </p>
            <p className="text-xs text-slate-light mt-0.5">
              {totalReviews} review{totalReviews !== 1 ? "s" : ""}
            </p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-lighter uppercase">On-time</p>
            <p className="text-2xl font-bold text-emerald mt-1 font-[family-name:var(--font-sora)]">
              {(onTime * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-light mt-0.5">deliveries</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-lighter uppercase">Disputes</p>
            <p className="text-2xl font-bold text-midnight mt-1 font-[family-name:var(--font-sora)]">
              {(disputeRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-light mt-0.5">of orders</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-lighter uppercase">Products</p>
            <p className="text-2xl font-bold text-midnight mt-1 font-[family-name:var(--font-sora)]">
              {products?.length ?? 0}
            </p>
            <p className="text-xs text-slate-light mt-0.5">active</p>
          </Card>
        </div>

        {/* Products */}
        <div>
          <CardTitle className="text-lg flex items-center gap-2 mb-3">
            <Package size={18} className="text-violet" />
            Products
          </CardTitle>
          {!products || products.length === 0 ? (
            <Card padding="md">
              <p className="text-sm text-slate-light text-center py-6">
                No products listed yet.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((p) => {
                const media = Array.isArray(p.product_media)
                  ? p.product_media[0]
                  : null;
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/product/${p.id}`}
                    className="block rounded-[--radius-lg] bg-white border border-mist overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-cloud overflow-hidden">
                      {media?.file_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={media.file_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={24} className="text-mist-dark" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-midnight line-clamp-2 min-h-[2rem]">
                        {p.name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-violet">
                        {formatNaira(p.price / 100)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div>
          <CardTitle className="text-lg flex items-center gap-2 mb-3">
            <Star size={18} className="text-gold" />
            Recent reviews
          </CardTitle>
          {!reviews || reviews.length === 0 ? (
            <Card padding="md">
              <p className="text-sm text-slate-light text-center py-6 flex items-center justify-center gap-2">
                <AlertCircle size={14} />
                No reviews yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => {
                const buyer = Array.isArray(r.buyer) ? r.buyer[0] : r.buyer;
                return (
                  <Card key={r.id} padding="sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-midnight">
                          {buyer?.full_name || "Anonymous"}
                        </p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={
                                i < r.rating
                                  ? "text-gold fill-current"
                                  : "text-mist"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-lighter">
                        {formatDate(r.created_at)}
                      </p>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm text-slate">{r.comment}</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-mist mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-lighter">
          &copy; {new Date().getFullYear()} Winipat — trust-first commerce for Nigeria
        </div>
      </footer>
    </div>
  );
}
