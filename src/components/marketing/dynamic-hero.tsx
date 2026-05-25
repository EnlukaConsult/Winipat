import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamic hero — left = copy + CTAs, right = animated 2x2 collage,
// bottom = looping process strip. Animations live in globals.css under
// the `.dh-*` namespace and are auto-disabled for prefers-reduced-motion.

const STEPS = [
  { n: 1, img: "/images/process/step-1.jpg", title: "Seller packs",      sub: "Item ready for pickup" },
  { n: 2, img: "/images/process/step-2.jpg", title: "Courier pickup",    sub: "Securely picked up" },
  { n: 3, img: "/images/process/step-3.jpg", title: "Buyer receives",    sub: "Delivery checked" },
  { n: 4, img: "/images/process/step-4.jpg", title: "Payment released",  sub: "Seller gets paid" },
];

// Strip contents duplicated inside the component so the animation
// loops seamlessly (translateX(-50%) lands exactly on the duplicate).
const STRIP = [
  "🛒 Buyer places order",
  "🛡️ Payment held in escrow",
  "🚚 Item delivered safely",
  "✅ Buyer confirms delivery",
  "🔓 Seller gets paid",
];

export function DynamicHero() {
  return (
    <section
      className="relative overflow-hidden pt-20 pb-12 lg:pb-16 px-4 sm:px-6 lg:px-8 text-white"
      style={{
        background: `
          radial-gradient(circle at 78% 18%, rgba(109,61,242,0.95), transparent 34%),
          radial-gradient(circle at 15% 80%, rgba(19,197,168,0.16), transparent 30%),
          linear-gradient(120deg, #050a22 0%, #11165c 50%, #6838ef 100%)
        `,
      }}
      aria-labelledby="hero-heading"
    >
      {/* Dotted backdrop, faded on the left so it doesn't fight the copy */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 58%)",
          maskImage: "linear-gradient(90deg, transparent 0%, black 58%)",
        }}
      />

      <div className="relative z-[1] max-w-[1520px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(350px,0.92fr)_minmax(560px,1.08fr)] gap-10 lg:gap-16 items-center">
        {/* ============ LEFT: copy + CTAs ============ */}
        <div>
          {/* Nigeria badge */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/[0.08] border border-white/[0.18] font-extrabold text-[13px] sm:text-sm">
            <span className="grid grid-cols-3 w-[30px] h-[22px] rounded-[4px] overflow-hidden" aria-hidden="true">
              <span className="bg-[#008751]" />
              <span className="bg-white" />
              <span className="bg-[#008751]" />
            </span>
            <span>Built in Nigeria. Trusted Nationwide.</span>
          </div>

          <h1
            id="hero-heading"
            className="font-[family-name:var(--font-sora)] mt-7 mb-5 leading-[0.98] tracking-[-0.055em]"
            style={{ fontSize: "clamp(40px, 5vw, 82px)" }}
          >
            Buy without the <span className="text-violet-light">worry.</span>
            <br />
            Sell without the <em className="not-italic text-teal-light">chase.</em>
          </h1>

          <p
            className="text-[#dfe7ff] leading-[1.55] mb-8 max-w-[610px]"
            style={{ fontSize: "clamp(16px, 1.35vw, 22px)" }}
          >
            Winipat is a secure marketplace with escrow protection that keeps
            buyer payments safe until delivery is confirmed.
          </p>

          {/* One dominant CTA + small text link, per the page's hero hierarchy */}
          <div className="mb-9">
            <Link href="/register" className="inline-block">
              <Button variant="gold" size="lg" className="min-w-[240px] justify-center">
                Start shopping
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <p className="mt-4 text-sm text-white/80">
              Selling on Winipat?{" "}
              <Link
                href="/register?role=seller"
                className="text-gold font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded"
              >
                Apply to sell →
              </Link>
            </p>
            <p className="mt-2 text-xs text-white/55">
              <Link href="/login" className="text-white/75 hover:text-gold hover:underline">
                Log in
              </Link>
              {" · "}
              <Link href="/track" className="text-white/75 hover:text-gold hover:underline">
                Track an order
              </Link>
            </p>
          </div>

          {/* Features — 3 short trust signals as supporting evidence */}
          <ul
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 pt-6 border-t border-white/[0.12] max-w-[680px]"
            role="list"
          >
            {[
              { strong: "Escrow Protection", small: "Your money is safe until delivery" },
              { strong: "Verified Sellers",  small: "Every seller is checked" },
              { strong: "Courier Choice",    small: "You choose at checkout" },
            ].map((f) => (
              <li key={f.strong}>
                <strong className="block text-[15px] font-semibold">{f.strong}</strong>
                <small className="block text-[13px] text-[#dfe7ff]/75 mt-1.5 leading-snug">
                  {f.small}
                </small>
              </li>
            ))}
          </ul>
        </div>

        {/* ============ RIGHT: animated collage ============ */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 isolate">
          {/* Pulsing dashed flow line (desktop only) */}
          <div
            aria-hidden="true"
            className="dh-flow hidden lg:block absolute z-[4] pointer-events-none rounded-[50%] border-r-2 border-dashed border-white/70"
            style={{ inset: "16% 39% 17% 45%" }}
          />

          {STEPS.map((s, i) => (
            <article
              key={s.n}
              className="dh-card relative overflow-hidden min-h-[235px] sm:min-h-[260px] lg:min-h-[275px] rounded-[28px] bg-white/[0.08] shadow-[0_26px_70px_rgba(0,0,0,0.3)]"
            >
              <Image
                src={s.img}
                alt={`${s.title} — ${s.sub}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 530px"
                className="object-cover"
                priority={i < 2}
              />
              <div className="absolute left-[18px] top-[18px] flex gap-3 items-start px-3.5 py-3 rounded-[18px] bg-white/[0.94] text-[#11183b] shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
                <b className="w-7 h-7 rounded-full grid place-items-center bg-violet text-white text-sm font-bold shrink-0">
                  {s.n}
                </b>
                <div>
                  <strong className="block text-[13px] sm:text-sm font-bold leading-tight">
                    {s.title}
                  </strong>
                  <small className="block text-[11px] sm:text-xs text-[#303553] mt-1 leading-tight">
                    {s.sub}
                  </small>
                </div>
              </div>
            </article>
          ))}

          {/* Escrow callout — absolute on desktop (overlay), static on mobile */}
          <div className="relative sm:absolute sm:z-[8] sm:left-[18px] sm:right-[18px] sm:bottom-[18px] mt-3 sm:mt-0 flex items-center gap-4 px-5 py-4 rounded-[24px] bg-[rgba(13,12,39,0.94)] border border-white/[0.09] shadow-[0_24px_56px_rgba(0,0,0,0.35)] col-span-1 sm:col-span-2">
            <span
              aria-hidden="true"
              className="w-12 h-12 rounded-2xl grid place-items-center shrink-0"
              style={{ background: "linear-gradient(135deg, var(--color-violet), #8c63ff)" }}
            >
              <Lock className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0">
              <strong className="block text-sm font-bold">
                Payment held securely in escrow
              </strong>
              <small className="block text-xs text-white/70 mt-1 leading-snug">
                Released only after buyer confirms delivery
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* ============ BOTTOM: scrolling process strip ============ */}
      <div className="relative z-[1] max-w-[1520px] mx-auto mt-10 sm:mt-12 overflow-hidden rounded-[24px] bg-white/[0.07] border border-white/[0.09]">
        <div
          className="dh-track flex gap-4 py-5 px-4"
          style={{ width: "max-content" }}
          aria-hidden="true"
        >
          {[...STRIP, ...STRIP].map((label, i) => (
            <span
              key={i}
              className="min-w-[220px] sm:min-w-[245px] px-5 py-3.5 rounded-[18px] bg-white/[0.08] font-extrabold text-sm text-center whitespace-nowrap"
            >
              {label}
            </span>
          ))}
        </div>
        {/* SR-only static version of the process list for screen readers */}
        <ol className="sr-only">
          {STRIP.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
