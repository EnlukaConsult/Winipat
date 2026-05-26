import { ShieldCheck, CheckCircle2, Truck } from "lucide-react";

// Left-side marketing column on /login and /register. Kept as one component
// so copy stays in sync between the two pages — they share the same value
// proposition, just different forms on the right.
export function AuthMarketing() {
  return (
    <div className="lg:pr-6">
      {/* Trust pill */}
      <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/[0.08] border border-white/[0.18] font-extrabold text-[13px] sm:text-sm">
        <span
          className="grid grid-cols-3 w-[30px] h-[22px] rounded-[4px] overflow-hidden"
          aria-hidden="true"
        >
          <span className="bg-[#008751]" />
          <span className="bg-white" />
          <span className="bg-[#008751]" />
        </span>
        <span>Secure marketplace for Nigeria</span>
      </div>

      <h1
        className="font-[family-name:var(--font-sora)] mt-7 mb-5 leading-[0.98] tracking-[-0.055em] max-w-[640px]"
        style={{ fontSize: "clamp(36px, 5vw, 64px)" }}
      >
        Sign in or create a secure Winipat account.
      </h1>

      <p
        className="text-[#dfe7ff] leading-[1.55] mb-8 max-w-[580px]"
        style={{ fontSize: "clamp(16px, 1.25vw, 19px)" }}
      >
        Your account is protected by escrow-backed security, verified sellers,
        and safer delivery confirmation.
      </p>

      {/* Trust grid — hidden on small phones to keep the page short */}
      <ul
        className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[640px]"
        role="list"
      >
        {[
          {
            icon: ShieldCheck,
            color: "#8f6bff",
            title: "Escrow protection",
            sub: "Payment held until delivery is confirmed.",
          },
          {
            icon: CheckCircle2,
            color: "#13c5a8",
            title: "Verified sellers",
            sub: "Shop from checked marketplace vendors.",
          },
          {
            icon: Truck,
            color: "#f6c54f",
            title: "Delivery confidence",
            sub: "Track orders and confirm delivery.",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <li
              key={card.title}
              className="p-5 rounded-2xl bg-white/[0.08] border border-white/[0.1]"
            >
              <Icon
                className="h-7 w-7"
                style={{ color: card.color }}
                aria-hidden="true"
              />
              <strong className="block mt-3 text-[15px] font-semibold">
                {card.title}
              </strong>
              <small className="block mt-1.5 text-[13px] text-white/70 leading-snug">
                {card.sub}
              </small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
