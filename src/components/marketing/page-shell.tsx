import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

interface MarketingPageShellProps {
  /** Page title shown in the hero */
  title: string;
  /** Optional one-liner sitting under the title */
  intro?: string;
  /** Breadcrumb label for the page (defaults to title) */
  breadcrumbLabel?: string;
  children: React.ReactNode;
}

// Shared shell for the "real-business" content pages — About, Shipping,
// Returns, FAQ, Trade. Gives them a consistent header so they feel like
// one site, not five disconnected pages.
export function MarketingPageShell({
  title,
  intro,
  breadcrumbLabel,
  children,
}: MarketingPageShellProps) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-white">
        <header className="bg-cloud border-b border-mist pt-24 pb-10 sm:pt-28 sm:pb-14">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-light mb-3">
              <Link href="/" className="hover:text-violet">Home</Link>
              <span className="mx-2 text-mist-dark">/</span>
              <span className="text-midnight">{breadcrumbLabel ?? title}</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-bold text-midnight font-[family-name:var(--font-sora)] leading-tight">
              {title}
            </h1>
            {intro && (
              <p className="mt-3 text-base sm:text-lg text-slate-light max-w-2xl leading-relaxed">
                {intro}
              </p>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <article className="text-slate text-[15px] leading-relaxed [&_h2]:font-[family-name:var(--font-sora)] [&_h2]:text-midnight [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-midnight [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_a]:text-violet hover:[&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_strong]:text-midnight [&_strong]:font-semibold">
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
