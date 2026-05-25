import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { createClient } from "@/lib/supabase/server";
import {
  ShieldCheck,
  Truck,
  Lock,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  UserCheck,
  Clock,
  PackageCheck,
  Quote,
  ChevronRight,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
} from "lucide-react";

// Marketing landing page. Structured top → bottom as:
//   Hero → Trust strip → Featured Categories (live data) →
//   How it works → Why trust us → For buyers / For sellers →
//   Testimonials (placeholder) → FAQ teaser → CTA
// Copy aims to be specific (real partners, real SLAs, real fees) and
// avoids generic AI-speak like "innovative solutions for African commerce".

// Re-render every 5 minutes so the Featured Categories tiles pick up
// new seller uploads without a full deploy.
export const revalidate = 300;

type CategoryTile = {
  label: string;
  href: string;
  blurb: string;
  image: string;       // public URL (real product photo or fallback)
  productName: string; // shown in alt text + tooltip
};

// Try each candidate slug in order until we find an active product with
// at least one image. Keeps the page from breaking if seed data uses
// slightly different slugs (we have both /fashion and /fashion-accessories
// across seed files).
async function getCategoryTile(
  candidates: string[],
  fallback: { label: string; blurb: string; image: string; href: string }
): Promise<CategoryTile> {
  const supabase = await createClient();

  for (const slug of candidates) {
    const { data } = await supabase
      .from("products")
      .select(
        `id, name, categories!inner(slug, name),
         product_media(file_url, display_order, media_type)`
      )
      .eq("status", "active")
      .eq("categories.slug", slug)
      .order("created_at", { ascending: false })
      .limit(6);

    if (!data) continue;

    for (const product of data) {
      const media = (product.product_media || [])
        .filter((m: { media_type: string }) => m.media_type === "image")
        .sort(
          (a: { display_order: number }, b: { display_order: number }) =>
            (a.display_order ?? 0) - (b.display_order ?? 0)
        );
      if (media[0]?.file_url) {
        return {
          label: fallback.label,
          href: `/dashboard/browse?category=${slug}`,
          blurb: fallback.blurb,
          image: media[0].file_url,
          productName: product.name,
        };
      }
    }
  }

  // No products yet for this category — show the bundled fallback image
  return {
    label: fallback.label,
    href: fallback.href,
    blurb: fallback.blurb,
    image: fallback.image,
    productName: fallback.label,
  };
}

async function getFeaturedCategories(): Promise<CategoryTile[]> {
  return Promise.all([
    getCategoryTile(["fashion-accessories", "fashion"], {
      label: "Fashion",
      blurb: "Aso-Oke, Ankara, ready-to-wear",
      image: "/images/products/ankara-dress.png",
      href: "/dashboard/browse",
    }),
    getCategoryTile(["electronics"], {
      label: "Electronics",
      blurb: "Phones, laptops, accessories",
      image: "/images/products/handbags-collection.jpg",
      href: "/dashboard/browse",
    }),
    getCategoryTile(["home-living"], {
      label: "Home & Living",
      blurb: "Appliances, kitchenware, furniture",
      image: "/images/products/handbags-collection.jpg",
      href: "/dashboard/browse",
    }),
    getCategoryTile(["health-beauty"], {
      label: "Beauty",
      blurb: "Skincare, fragrance, hair",
      image: "/images/products/ankara-dress.png",
      href: "/dashboard/browse",
    }),
  ]);
}

export default async function HomePage() {
  const featuredCategories = await getFeaturedCategories();
  return (
    <>
      <Navbar />

      <main id="main-content">
        {/* ===== HERO ===== */}
        <section className="relative min-h-[88dvh] flex items-center bg-hero-gradient overflow-hidden">
          {/* One subtle blur — less "AI gradient soup" than three */}
          <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] bg-violet/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-12 sm:pt-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 mb-6 backdrop-blur-sm border border-white/10">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold" />
                  <span className="text-xs text-white/90 font-medium">
                    Built in Lagos · Live across Nigeria
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white font-[family-name:var(--font-sora)] leading-[1.05] tracking-tight mb-5">
                  Buy without the worry.{" "}
                  <span className="text-gold">Sell without the chase.</span>
                </h1>

                <p className="text-base sm:text-lg text-white/75 mb-8 max-w-xl leading-relaxed">
                  Winipat holds buyer payments in escrow until delivery is
                  confirmed. Every seller is KYC-verified. You pick the courier
                  at checkout. If something goes wrong, your money stays put
                  until our team reviews evidence from both sides.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/register">
                    <Button variant="gold" size="lg" className="w-full sm:w-auto">
                      Start shopping
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/register?role=seller">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-white/30 text-white hover:bg-white hover:text-midnight"
                    >
                      Apply to sell
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-white/65 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald" />
                    KYC-verified sellers
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald" />
                    Escrow on every order
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald" />
                    Courier choice at checkout
                  </span>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  {/*
                    Hero image: 4-panel collage uploaded by user showing
                    seller packing → courier pickup → buyer receiving →
                    payment released. The collage already tells the story
                    visually so we drop the floating badge that used to
                    sit over it — would compete with the image's own
                    inline labels.
                  */}
                  <Image
                    src="/images/hero-main.png"
                    alt="The Winipat trust flow: seller packs, courier picks up, buyer receives, payment is released"
                    width={600}
                    height={500}
                    className="w-full h-[460px] object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUST STRIP ===== */}
        <section className="border-y border-mist bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
              {[
                { stat: "48h", label: "Buyer protection window after delivery" },
                { stat: "12%", label: "Flat platform commission. No listing fees." },
                { stat: "3 couriers", label: "GIG, Sendbox, Kwik — you choose" },
                { stat: "36 states", label: "+ FCT. Nationwide delivery coverage." },
              ].map((s) => (
                <div key={s.label} className="flex flex-col md:items-start items-center">
                  <p className="text-2xl sm:text-3xl font-bold text-midnight font-[family-name:var(--font-sora)]">
                    {s.stat}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-light mt-1 max-w-[180px]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURED CATEGORIES ===== */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wider text-violet font-semibold mb-2">
                  Shop by category
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)]">
                  What people are buying right now.
                </h2>
              </div>
              <Link
                href="/dashboard/browse"
                className="text-sm font-semibold text-violet hover:underline inline-flex items-center gap-1 shrink-0"
              >
                Browse all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {featuredCategories.map((c, i) => {
                const Icon =
                  c.label === "Fashion"      ? Shirt :
                  c.label === "Electronics"  ? Smartphone :
                  c.label === "Home & Living" ? Sofa :
                  Sparkles;
                // Slice categories-strip.png into 4 panels using
                // background-size: 400% (4x wider than the tile) +
                // background-position-x stepped by 33.3% so each tile
                // shows one of the four photos. Order in the strip
                // (left -> right): Fashion, Electronics, Home, Beauty.
                const panelPositions = ["0%", "33.333%", "66.667%", "100%"];
                return (
                  <Link
                    key={c.label}
                    href={c.href}
                    className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-cloud border border-mist hover:shadow-lg transition-shadow"
                  >
                    <div
                      className="absolute inset-0 bg-no-repeat transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{
                        backgroundImage: "url(/images/categories-strip.png)",
                        backgroundSize: "400% 100%",
                        backgroundPosition: `${panelPositions[i]} 50%`,
                      }}
                      role="img"
                      aria-label={`${c.label} category`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight/85 via-midnight/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                          <Icon size={14} className="text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm sm:text-base">
                          {c.label}
                        </p>
                      </div>
                      <p className="text-xs text-white/70 leading-tight">
                        {c.blurb}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how-it-works" className="py-16 sm:py-20 bg-cloud">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <p className="text-xs uppercase tracking-wider text-violet font-semibold mb-2">
                How it works
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-4">
                Five steps. One protection layer the whole way through.
              </h2>
              <p className="text-slate-light text-base">
                You don&apos;t need to trust the seller. You trust the system holding
                the money.
              </p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                {
                  n: "1",
                  icon: CreditCard,
                  title: "You pay",
                  desc: "Card or transfer via Paystack. Funds land in Winipat escrow, not the seller's account.",
                },
                {
                  n: "2",
                  icon: PackageCheck,
                  title: "Seller prepares",
                  desc: "Verified seller accepts within 24h, packs the order, uploads a package photo.",
                },
                {
                  n: "3",
                  icon: Truck,
                  title: "Courier delivers",
                  desc: "The partner you picked at checkout (GIG, Sendbox, Kwik) picks up and ships.",
                },
                {
                  n: "4",
                  icon: ShieldCheck,
                  title: "You confirm",
                  desc: "Inspect the package within 48h. Confirm delivery or open a dispute with photos.",
                },
                {
                  n: "5",
                  icon: CheckCircle2,
                  title: "Seller is paid",
                  desc: "Once confirmation or auto-confirm lands, payout is processed within 24h.",
                },
              ].map((s) => (
                <li
                  key={s.n}
                  className="rounded-xl border border-mist bg-white p-5 relative"
                >
                  <span className="absolute top-3 right-4 text-3xl font-bold text-mist font-[family-name:var(--font-sora)]">
                    {s.n}
                  </span>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-violet/10 text-violet mb-3">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-midnight text-sm mb-1.5">
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-light leading-relaxed">
                    {s.desc}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-xs text-slate-light">
              Want the long version with SLA windows and what happens when things
              go wrong?{" "}
              <Link href="/shipping" className="text-violet hover:underline">
                Read the shipping & delivery page
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ===== WHY TRUST WINIPAT ===== */}
        <section id="features" className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <p className="text-xs uppercase tracking-wider text-violet font-semibold mb-2">
                Why trust us
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)]">
                Specific, operational, no marketing fluff.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  icon: UserCheck,
                  title: "Sellers are reviewed by hand",
                  body:
                    "Every applying seller submits government ID, bank verification, and a phone number. We review applications individually for the first six months — no auto-approval, no rubber stamping.",
                },
                {
                  icon: Lock,
                  title: "Escrow only releases on proof",
                  body:
                    "Your money sits in a Paystack escrow account, not a seller's wallet. Release happens only after your confirmation or a 48-hour auto-confirm window — and freezes immediately if you open a dispute.",
                },
                {
                  icon: Clock,
                  title: "Real humans answer support",
                  body:
                    "Mon–Fri 09:00–18:00 WAT. The AI assistant on this site handles common questions, but anything stuck routes to a real teammate at support@winipat.com. Reply usually within one business day.",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-mist bg-white p-6 hover:border-violet/30 transition-colors"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-emerald/10 text-emerald mb-4">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-midnight mb-2">
                    {c.title}
                  </h3>
                  <p className="text-sm text-slate-light leading-relaxed">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FOR BUYERS / FOR SELLERS ===== */}
        <section className="py-16 sm:py-20 bg-cloud">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* For Buyers */}
              <div className="rounded-2xl bg-midnight text-white p-8 sm:p-10 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet/20 rounded-full blur-2xl pointer-events-none" />
                <div className="relative">
                  <p className="text-xs uppercase tracking-wider text-gold font-semibold mb-2">
                    For Buyers
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-sora)] mb-4">
                    Pay with confidence.
                  </h3>
                  <ul className="space-y-3 text-sm text-white/80 mb-6">
                    <li className="flex items-start gap-2.5">
                      <ChevronRight className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span>Browse without an account; only register at checkout</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <ChevronRight className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span>Pick from saved addresses, change couriers per order</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <ChevronRight className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span>Open a photo-backed dispute up to 48h after delivery</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <ChevronRight className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span>Track any order without signing in via the order number</span>
                    </li>
                  </ul>
                  <Link href="/register">
                    <Button variant="gold" size="md">
                      Create buyer account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* For Sellers */}
              <div id="sellers" className="rounded-2xl bg-white border border-mist p-8 sm:p-10">
                <p className="text-xs uppercase tracking-wider text-violet font-semibold mb-2">
                  For Sellers
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-4">
                  Sell without chasing payments.
                </h3>
                <ul className="space-y-3 text-sm text-slate mb-6">
                  <li className="flex items-start gap-2.5">
                    <ChevronRight className="h-4 w-4 text-violet shrink-0 mt-0.5" />
                    <span>12% flat commission. No listing or monthly fees.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ChevronRight className="h-4 w-4 text-violet shrink-0 mt-0.5" />
                    <span>Daily payouts to your bank, 48h after buyer confirms</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ChevronRight className="h-4 w-4 text-violet shrink-0 mt-0.5" />
                    <span>Bulk product upload via CSV. Per-product custom escrow window.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ChevronRight className="h-4 w-4 text-violet shrink-0 mt-0.5" />
                    <span>Trust score + badges (Verified, Trusted Seller, Fast Dispatch)</span>
                  </li>
                </ul>
                <Link href="/register?role=seller">
                  <Button variant="primary" size="md">
                    Apply to sell
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS (honest placeholder until we have real ones) ===== */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <p className="text-xs uppercase tracking-wider text-violet font-semibold mb-2">
                Voices from the early cohort
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)]">
                Real reviews coming as the first orders close.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  quote:
                    "Three months in. We&apos;ll publish verified buyer testimonials here as orders complete — same buyer name, same star rating, no edits.",
                  meta: "Reserved · Buyer testimonial",
                },
                {
                  quote:
                    "Reserved space for seller stories. We won&apos;t use AI-generated quotes or stock photos. If you&apos;re a seller and want to share your experience, email us.",
                  meta: "Reserved · Seller testimonial",
                },
                {
                  quote:
                    "Reserved space for logistics partner feedback. We&apos;ll publish what GIG, Sendbox and Kwik teams say after their first month working with us.",
                  meta: "Reserved · Partner testimonial",
                },
              ].map((t, i) => (
                <figure
                  key={i}
                  className="rounded-xl border border-dashed border-mist-dark bg-cloud/50 p-6"
                >
                  <Quote className="h-5 w-5 text-violet/40 mb-3" />
                  <blockquote className="text-sm text-slate leading-relaxed mb-4 italic">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="text-xs text-slate-lighter font-medium">
                    {t.meta}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-6 text-xs text-slate-lighter">
              We chose to leave these placeholders rather than fake them. Real
              buyer reviews appear on every <Link href="/sellers" className="text-violet hover:underline">seller reputation page</Link> as soon as orders complete.
            </p>
          </div>
        </section>

        {/* ===== FAQ TEASER ===== */}
        <section className="py-16 sm:py-20 bg-cloud">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs uppercase tracking-wider text-violet font-semibold mb-2">
              Questions we hear most
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-8">
              The short answers.
            </h2>

            <div className="space-y-3">
              {[
                {
                  q: "How is this different from Jumia or Konga?",
                  a: "Two things. First, your money sits in escrow under our control until you confirm — not in the seller's wallet from the moment you click pay. Second, you pick the courier yourself; we don't bundle delivery into a black box.",
                },
                {
                  q: "What if the seller never ships?",
                  a: "Sellers have 24h to accept an order after payment. If they don't, the order is auto-cancelled and you get a full refund. If they accept but stall on shipping past 72h, you can open a dispute and we'll mediate.",
                },
                {
                  q: "What does Winipat earn from this?",
                  a: "12% commission on delivered orders. That's it. No listing fees, no buyer fees, no charges on refunded orders. Logistics fees go directly to the courier — we don't take a cut on those.",
                },
                {
                  q: "Can I shop without registering?",
                  a: "Yes, browse and view seller pages freely. You only need an account at checkout. You can also track any order at /track with just the order number and email.",
                },
              ].map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-mist bg-white p-5 open:border-violet/30"
                >
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-3 text-midnight font-semibold text-[15px]">
                    <span>{f.q}</span>
                    <span className="text-violet text-xl leading-none shrink-0 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-light leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>

            <p className="mt-6 text-sm">
              <Link
                href="/faq"
                className="text-violet font-semibold hover:underline inline-flex items-center gap-1"
              >
                See all 17 FAQs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl bg-gradient-to-br from-midnight via-midnight-light to-violet-dark p-8 sm:p-12 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative text-center max-w-2xl mx-auto">
                <ShieldCheck className="h-10 w-10 text-gold mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-sora)] mb-3">
                  Try one order. See if it feels different.
                </h2>
                <p className="text-white/70 text-sm sm:text-base mb-7">
                  Sign up takes 30 seconds. You can browse first, decide later.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/register">
                    <Button variant="gold" size="lg" className="w-full sm:w-auto">
                      Create account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/register?role=seller">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-white/30 text-white hover:bg-white hover:text-midnight"
                    >
                      Apply to sell
                    </Button>
                  </Link>
                </div>
                <p className="mt-5 text-xs text-white/55">
                  Questions before signing up?{" "}
                  <Link href="/contact" className="text-gold hover:underline">
                    Contact support
                  </Link>{" "}
                  · Mon–Fri 09:00–18:00 WAT
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
