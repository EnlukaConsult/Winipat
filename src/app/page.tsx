import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import {
  ShieldCheck,
  Truck,
  Star,
  Lock,
  Eye,
  MessageSquareWarning,
  ArrowRight,
  CheckCircle2,
  Package,
  CreditCard,
  UserCheck,
  BadgeCheck,
  TrendingUp,
  Sparkles,
  QrCode,
  Video,
  Clock,
  Banknote,
  Heart,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-dvh flex items-center bg-hero-gradient overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-20 w-72 h-72 bg-royal/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[--radius-full] bg-white/10 px-4 py-2 mb-8 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="h-4 w-4 text-gold" />
                <span className="text-sm text-white/90">
                  Trust-First Commerce for Nigeria
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-[family-name:var(--font-sora)] leading-tight mb-6">
                Trust what you buy.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-light">
                  Track how it moves.
                </span>{" "}
                Pay with confidence.
              </h1>

              <p className="text-lg sm:text-xl text-white/75 mb-10 max-w-2xl leading-relaxed">
                Winipat is a trust-first commerce platform connecting buyers,
                verified sellers, and logistics partners through escrow-backed
                payments and transparent delivery coordination across Nigeria.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button variant="gold" size="lg" className="w-full sm:w-auto">
                    Start Shopping Safely
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/register?role=seller">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/30 text-white hover:bg-white hover:text-midnight"
                  >
                    Sell on Winipat
                  </Button>
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-6 sm:gap-8 text-white/60 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                  Verified Sellers Only
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                  Escrow-Backed Payments
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                  Buyer-Chosen Delivery
                </div>
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block relative">
              <div className="relative rounded-[--radius-xl] overflow-hidden shadow-2xl">
                <Image
                  src="/images/products/handbags-collection.jpg"
                  alt="Designer handbags on Winipat"
                  width={600}
                  height={500}
                  className="w-full h-[500px] object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="glass rounded-[--radius-lg] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">Payment Protected</p>
                        <p className="text-white/60 text-xs">Escrow holds funds until delivery confirmed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT IS WINIPAT ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative flex justify-center">
              {/* Circular photo with gradient ring — matching brand profile style */}
              <div className="relative w-[280px] h-[280px] sm:w-[380px] sm:h-[380px]">
                {/* Animated gradient ring */}
                <div className="absolute inset-0 rounded-full p-[5px] bg-[conic-gradient(#d4a853,#4338ca,#7c3aed,#14B8A6,#d4a853)] shadow-[0_0_50px_rgba(67,56,202,0.35),0_0_100px_rgba(212,168,83,0.15)] animate-spin" style={{ animationDuration: "8s" }}>
                  <div className="w-full h-full rounded-full overflow-hidden border-[5px] border-midnight">
                    <Image
                      src="/images/profile-photo.png"
                      alt="Winipat - Trust-first commerce"
                      width={400}
                      height={400}
                      className="w-full h-full object-cover object-[center_top] brightness-[1.04] contrast-[1.1] saturate-[1.06]"
                      priority
                    />
                  </div>
                </div>
              </div>
              {/* 0% Scam Rate badge */}
              <div className="absolute -bottom-2 right-1/4 sm:right-1/4 bg-royal rounded-[--radius-lg] p-4 sm:p-5 shadow-xl z-10">
                <p className="text-white text-2xl sm:text-3xl font-bold font-[family-name:var(--font-sora)]">0%</p>
                <p className="text-white/70 text-xs sm:text-sm">Scam Rate</p>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-[--radius-full] bg-royal/10 px-4 py-2 mb-6">
                <Sparkles className="h-4 w-4 text-royal" />
                <span className="text-sm text-royal font-medium">What is Winipat?</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-6">
                Not just another marketplace. A trust infrastructure for African commerce.
              </h2>
              <p className="text-slate-light text-base sm:text-lg mb-6 leading-relaxed">
                Winipat solves the biggest problem in Nigerian online commerce: <strong className="text-midnight">trust</strong>.
                Too many buyers have paid for products they never received, or received something completely different
                from what was advertised. Sellers struggle to prove their legitimacy.
              </p>
              <p className="text-slate-light text-base sm:text-lg mb-8 leading-relaxed">
                Winipat changes this by combining <strong className="text-midnight">verified sellers</strong>,
                <strong className="text-midnight"> escrow-backed payments</strong>,
                <strong className="text-midnight"> buyer-chosen logistics</strong>, and a
                <strong className="text-midnight"> proof-based delivery flow</strong> into one platform.
                Your money is protected until you confirm you received exactly what you ordered.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, label: "Verified Sellers", desc: "KYC + ID verified" },
                  { icon: Lock, label: "Escrow Payments", desc: "Funds held safely" },
                  { icon: Truck, label: "You Choose Delivery", desc: "Your preferred logistics" },
                  { icon: Star, label: "Real Reviews", desc: "Only from real buyers" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-[--radius-md] bg-cloud">
                    <item.icon className="h-5 w-5 text-royal shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-midnight">{item.label}</p>
                      <p className="text-xs text-slate-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== KOKO'S STORY ===== */}
      <section className="py-16 sm:py-24 bg-cloud">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-[--radius-full] bg-gold/10 px-4 py-2 mb-6">
              <Heart className="h-4 w-4 text-gold-dark" />
              <span className="text-sm text-gold-dark font-medium">The Winipat Story</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-4">
              See how Koko shops with confidence
            </h2>
            <p className="text-slate-light max-w-2xl mx-auto text-base sm:text-lg">
              A real scenario of how Winipat protects every step of a transaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Koko finds a designer bag",
                description: "She watches a live demo video from seller Peace, who shows the bag's details, texture, and quality on camera. Koko trusts what she sees.",
                icon: Video,
                color: "bg-royal/10 text-royal",
              },
              {
                step: "2",
                title: "She pays with confidence",
                description: "Koko pays through Winipat. Her money is held in escrow — Peace won't receive payment until Koko confirms delivery. No risk.",
                icon: Lock,
                color: "bg-emerald/10 text-emerald-dark",
              },
              {
                step: "3",
                title: "She also pays her bills",
                description: "While shopping, Koko recharges her airtime and pays her electricity bill — all inside the same app. Three tasks, two minutes.",
                icon: Banknote,
                color: "bg-violet/10 text-violet",
              },
              {
                step: "4",
                title: "Peace prepares the order",
                description: "Peace photographs the bag before and after packaging. Winipat generates a unique QR code for the order. Eight-second pickup confirmation.",
                icon: QrCode,
                color: "bg-gold/10 text-gold-dark",
              },
              {
                step: "5",
                title: "GIG delivers to Koko's door",
                description: "Koko tracks delivery in-app. When the bag arrives, it's exactly what Peace showed. She uploads a delivery photo. Match confirmed.",
                icon: Truck,
                color: "bg-info/10 text-info",
              },
              {
                step: "6",
                title: "Everyone wins",
                description: "Payment releases to Peace. Koko leaves a verified review. Peace's trust score rises. No scams. No arguments. Just trust.",
                icon: Star,
                color: "bg-emerald/10 text-emerald-dark",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[--radius-lg] bg-white border border-mist p-6 sm:p-8 hover:shadow-lg transition-shadow duration-300 relative"
              >
                <div className="absolute top-6 right-6 sm:top-8 sm:right-8 text-4xl font-bold text-mist font-[family-name:var(--font-sora)]">
                  {item.step}
                </div>
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-[--radius-md] ${item.color} mb-5`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-midnight mb-2 pr-8">
                  {item.title}
                </h3>
                <p className="text-slate-light text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 rounded-[--radius-lg] bg-midnight text-white px-6 py-4 shadow-lg">
              <ShieldCheck className="h-6 w-6 text-gold shrink-0" />
              <p className="text-sm sm:text-base">
                <strong>No scams. No arguments. No &quot;I received something different.&quot;</strong>
                <span className="text-white/60 ml-2">Just trust, verified by video, backed by escrow.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-4">
              How Winipat Works
            </h2>
            <p className="text-slate-light max-w-2xl mx-auto text-base sm:text-lg">
              A simple, secure flow that protects every transaction from browsing to delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                step: "01",
                icon: Eye,
                title: "Browse & Discover",
                description: "Find products from verified sellers. Watch demo videos, read verified reviews, and buy with confidence.",
              },
              {
                step: "02",
                icon: CreditCard,
                title: "Pay Securely",
                description: "Your payment is held in escrow by Winipat. The seller only gets paid after you confirm delivery.",
              },
              {
                step: "03",
                icon: Truck,
                title: "Track Delivery",
                description: "Choose your preferred logistics partner — GIG, DHL, or others. Track your package from seller to your door.",
              },
              {
                step: "04",
                icon: Star,
                title: "Review & Complete",
                description: "Confirm delivery, leave a verified review. Payment releases to seller after a 2-day hold period.",
              },
            ].map((item) => (
              <div key={item.step} className="relative group text-center sm:text-left">
                <div className="mb-4 text-5xl font-bold text-mist font-[family-name:var(--font-sora)] group-hover:text-royal/20 transition-colors">
                  {item.step}
                </div>
                <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-[--radius-md] bg-royal/10 text-royal">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-midnight mb-2">{item.title}</h3>
                <p className="text-slate-light text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" className="py-16 sm:py-24 bg-cloud">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-4">
              Built on Trust Infrastructure
            </h2>
            <p className="text-slate-light max-w-2xl mx-auto text-base sm:text-lg">
              Every feature is designed to eliminate doubt and create accountability across every transaction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Sellers",
                description: "Every seller passes government ID verification, bank validation, and phone confirmation before listing a single product.",
                color: "text-emerald",
                bg: "bg-emerald/10",
              },
              {
                icon: Lock,
                title: "Escrow Payments",
                description: "Payments are held securely until delivery is confirmed. Sellers get paid, buyers stay protected. No exceptions.",
                color: "text-royal",
                bg: "bg-royal/10",
              },
              {
                icon: Truck,
                title: "Buyer-Chosen Logistics",
                description: "Select your preferred logistics partner at checkout. Compare options, costs, and delivery times. You decide.",
                color: "text-violet",
                bg: "bg-violet/10",
              },
              {
                icon: Star,
                title: "Verified Reviews Only",
                description: "Only buyers who completed and received their orders can leave reviews. No fake reviews, no manipulation.",
                color: "text-gold-dark",
                bg: "bg-gold/10",
              },
              {
                icon: MessageSquareWarning,
                title: "Fair Dispute Resolution",
                description: "Upload photo and video evidence, get fair resolution by our team. Funds remain protected until disputes are resolved.",
                color: "text-error",
                bg: "bg-error/10",
              },
              {
                icon: Package,
                title: "Proof-Based Delivery",
                description: "Photo proof at pickup and delivery. QR-code verified handoffs. Complete transparency from seller to your hands.",
                color: "text-info",
                bg: "bg-info/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-[--radius-lg] bg-white border border-mist p-6 sm:p-8 hover:shadow-lg transition-shadow duration-300"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-[--radius-md] ${feature.bg} ${feature.color} mb-5`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-midnight mb-2">{feature.title}</h3>
                <p className="text-slate-light text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOR BUYERS ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-[--radius-full] bg-emerald/10 px-4 py-2 mb-6">
                <Package className="h-4 w-4 text-emerald-dark" />
                <span className="text-sm text-emerald-dark font-medium">For Buyers</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-6">
                Shop like you&apos;re buying in person — but from anywhere in Nigeria
              </h2>
              <p className="text-slate-light text-base sm:text-lg mb-8 leading-relaxed">
                Watch product videos before you buy. Choose how it gets delivered.
                Your payment stays protected until you say it&apos;s right. If something is wrong,
                we hold the funds and resolve it fairly.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Watch live product demos and short videos",
                  "Choose your own logistics partner at checkout",
                  "Track delivery from seller to your door",
                  "Your money is 100% protected by escrow",
                  "Leave verified reviews after confirmed delivery",
                  "Open disputes with photo/video evidence",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
                    <span className="text-slate text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Start Shopping
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="rounded-[--radius-xl] overflow-hidden shadow-lg">
                <Image
                  src="/images/products/designer-bags.png"
                  alt="Designer bags on Winipat"
                  width={600}
                  height={450}
                  className="w-full h-[280px] sm:h-[400px] object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-emerald rounded-[--radius-lg] p-4 sm:p-5 shadow-xl">
                <Lock className="h-6 w-6 text-white mb-1" />
                <p className="text-white text-xs sm:text-sm font-semibold">Payment Protected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOR SELLERS ===== */}
      <section id="sellers" className="py-16 sm:py-24 bg-hero-gradient-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[--radius-full] bg-white/10 px-4 py-2 mb-6">
                <BadgeCheck className="h-4 w-4 text-gold" />
                <span className="text-sm text-white/90">For Sellers</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white font-[family-name:var(--font-sora)] mb-6">
                Grow your business with trust as your competitive edge
              </h2>
              <p className="text-white/70 text-base sm:text-lg mb-8 leading-relaxed">
                Join Winipat as a verified seller and access a marketplace where
                your credibility drives sales. Get paid faster, build customer
                loyalty, and earn trust badges that boost your visibility.
              </p>

              <ul className="space-y-4 mb-10">
                {[
                  "Structured daily settlement to your bank account",
                  "Trust badges: Verified, Trusted Seller, Fast Dispatch",
                  "Earnings dashboard with full payout transparency",
                  "In-app buyer messaging (no phone number exposure)",
                  "Dispute protection with evidence-based resolution",
                  "Upload product videos and live demos",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
                    <span className="text-white/80 text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register?role=seller">
                <Button variant="gold" size="lg" className="w-full sm:w-auto">
                  Apply to Sell
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div>
              <div className="rounded-[--radius-xl] overflow-hidden shadow-2xl mb-6">
                <Image
                  src="/images/products/ankara-dress.png"
                  alt="Ankara fashion on Winipat"
                  width={600}
                  height={350}
                  className="w-full h-[250px] sm:h-[350px] object-cover"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: UserCheck, label: "Verified Identity", value: "KYC + Bank" },
                  { icon: TrendingUp, label: "Avg. Settlement", value: "24hrs" },
                  { icon: ShieldCheck, label: "Escrow Protection", value: "100%" },
                  { icon: Star, label: "Review System", value: "Verified Only" },
                ].map((stat) => (
                  <div key={stat.label} className="glass rounded-[--radius-lg] p-4 sm:p-6 text-center">
                    <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-gold mx-auto mb-2 sm:mb-3" />
                    <p className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-sora)]">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-white/60 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LOGISTICS SECTION ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative">
              <div className="rounded-[--radius-xl] overflow-hidden shadow-lg">
                <Image
                  src="/images/delivery.jpg"
                  alt="Delivery partner on Winipat"
                  width={600}
                  height={400}
                  className="w-full h-[280px] sm:h-[400px] object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-gold rounded-[--radius-lg] p-4 sm:p-5 shadow-xl">
                <Clock className="h-6 w-6 text-midnight mb-1" />
                <p className="text-midnight text-xs sm:text-sm font-semibold">8-Second Pickup</p>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-[--radius-full] bg-violet/10 px-4 py-2 mb-6">
                <Truck className="h-4 w-4 text-violet" />
                <span className="text-sm text-violet font-medium">Logistics Partners</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-6">
                Cleaner coordination. Faster pickups. Zero disputes.
              </h2>
              <p className="text-slate-light text-base sm:text-lg mb-8 leading-relaxed">
                Logistics partners get structured pickup assignments with QR-verified handoffs.
                No more ambiguity at collection. No more &quot;the package doesn&apos;t match&quot; disputes.
                Every order has photo proof and a digital trail.
              </p>
              <div className="space-y-4">
                {[
                  { icon: QrCode, title: "QR-Verified Pickup", desc: "Scan, verify, confirm — in seconds" },
                  { icon: Package, title: "Order-Linked Visibility", desc: "Every delivery tied to a verified order" },
                  { icon: CheckCircle2, title: "Proof of Delivery", desc: "Photo proof logged for every handoff" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-[--radius-md] bg-cloud">
                    <item.icon className="h-6 w-6 text-violet shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-midnight text-sm sm:text-base">{item.title}</p>
                      <p className="text-slate-light text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ESCROW EXPLAINER ===== */}
      <section className="py-16 sm:py-24 bg-midnight text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-sora)] mb-4">
              How your money stays{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-light">
                protected
              </span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-base sm:text-lg">
              Winipat&apos;s escrow system ensures sellers get paid fairly and buyers never lose money to scams.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { step: "1", title: "You Pay", desc: "Funds go to Winipat escrow", icon: CreditCard },
              { step: "2", title: "Seller Prepares", desc: "Photos + QR code generated", icon: Package },
              { step: "3", title: "Logistics Delivers", desc: "Tracked and proof-verified", icon: Truck },
              { step: "4", title: "You Confirm", desc: "2-day hold for safety", icon: CheckCircle2 },
              { step: "5", title: "Seller Gets Paid", desc: "Less 12% commission", icon: Banknote },
            ].map((item) => (
              <div key={item.step} className="text-center p-4 sm:p-6 rounded-[--radius-lg] bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-gold font-bold text-sm">{item.step}</span>
                </div>
                <item.icon className="h-6 w-6 text-gold mx-auto mb-2" />
                <h3 className="font-semibold text-sm sm:text-base mb-1">{item.title}</h3>
                <p className="text-white/50 text-xs sm:text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-16 sm:py-24 bg-cloud">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-[--radius-xl] bg-hero-gradient p-8 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />
            </div>

            <div className="relative">
              <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-gold mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-[family-name:var(--font-sora)] mb-4">
                Ready to shop with confidence?
              </h2>
              <p className="text-white/70 text-base sm:text-lg mb-8 max-w-xl mx-auto">
                Join Winipat today. No scams. No surprises. Just trust, verified by video,
                backed by escrow, sealed with a QR code.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button variant="gold" size="lg" className="w-full sm:w-auto">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/register?role=seller">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/30 text-white hover:bg-white hover:text-midnight"
                  >
                    Apply to Sell
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
