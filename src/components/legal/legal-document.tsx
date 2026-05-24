import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

interface LegalDocumentProps {
  title: string;
  effectiveDate: string;          // e.g. "24 May 2026"
  intro: string;                   // 1-2 sentence summary at the top
  children: React.ReactNode;
}

/**
 * Shared layout for all /legal/* pages. Renders a clean reading container
 * with consistent typography. Pages pass section content as children.
 */
export function LegalDocument({ title, effectiveDate, intro, children }: LegalDocumentProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-light hover:text-royal transition-colors mb-6 no-underline"
      >
        <ArrowLeft size={14} />
        Back to Winipat
      </Link>

      <div className="rounded-[--radius-lg] bg-white border border-mist p-6 sm:p-10 shadow-sm">
        <div className="flex items-start gap-3 mb-2">
          <div className="h-9 w-9 rounded-[--radius-md] bg-royal/10 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-royal" />
          </div>
          <h1 className="font-[family-name:var(--font-sora)] text-3xl sm:text-4xl font-bold text-midnight leading-tight">
            {title}
          </h1>
        </div>
        <p className="text-sm text-slate-light mb-6 ml-12">
          Effective: {effectiveDate}
        </p>
        <p className="text-base text-slate-light mb-8 leading-relaxed border-l-4 border-royal/30 pl-4">
          {intro}
        </p>

        {/* Document body — children render with consistent legal-doc typography */}
        <div className="legal-prose space-y-6 text-slate leading-relaxed text-[15px]">
          {children}
        </div>

        {/* Footer block */}
        <div className="mt-12 pt-6 border-t border-mist text-sm text-slate-light">
          <p>
            Questions? Email{" "}
            <a href="mailto:support@winipat.com" className="text-royal underline hover:text-midnight">
              support@winipat.com
            </a>
            .
          </p>
          <p className="mt-2 text-xs">
            This document is provided in good faith. It may be revised; the latest version always
            lives at <span className="font-mono">winipat.com/legal</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Section helpers — use these inside <LegalDocument> for consistent styling.
 */
export function Section({
  number,
  title,
  children,
}: {
  number: string | number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-midnight flex items-start gap-2">
        <span className="text-royal font-mono text-base mt-0.5">{number}.</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-3 ml-7">
        {children}
      </div>
    </section>
  );
}

export function Para({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function Bullets({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-1.5">
      {children}
    </ul>
  );
}
