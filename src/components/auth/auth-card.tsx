import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";

type AuthCardProps = {
  heading: string;
  subheading: string;
  children: React.ReactNode;
  footerNote?: string; // optional bottom strip; defaults to escrow-security note
};

// Shared white card used on every auth page: dark-gradient header with the
// brand mark, then a body slot for the form, then a faint security footer.
// On mobile it spans full width; on lg it caps at 480px so the marketing
// column has room next to it.
export function AuthCard({
  heading,
  subheading,
  children,
  footerNote = "Your account is protected by escrow-backed security",
}: AuthCardProps) {
  return (
    <div className="w-full lg:max-w-[480px] mx-auto overflow-hidden rounded-3xl bg-white text-slate shadow-[0_34px_90px_rgba(0,0,0,0.34)] border border-white/30">
      {/* Dark header */}
      <div className="bg-gradient-to-b from-[#0c122a] to-[#141c45] text-white text-center px-6 sm:px-8 py-7 sm:py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-1.5 shadow-[0_16px_35px_rgba(0,0,0,0.22)] mb-4">
          <Logo size="md" variant="icon" />
        </div>
        <h1 className="font-[family-name:var(--font-sora)] text-[22px] sm:text-2xl font-bold leading-tight">
          {heading}
        </h1>
        <p className="mt-2 text-[13px] sm:text-sm text-white/70 leading-relaxed">
          {subheading}
        </p>
      </div>

      {/* Body — form goes here */}
      <div className="px-6 sm:px-8 py-7">{children}</div>

      {/* Footer strip */}
      {footerNote && (
        <div className="px-6 sm:px-8 py-4 border-t border-mist bg-cloud/60 text-center">
          <p className="text-[12px] text-slate-light flex items-center justify-center gap-1.5">
            <ShieldCheck
              className="h-3.5 w-3.5 text-emerald shrink-0"
              aria-hidden="true"
            />
            {footerNote}
          </p>
        </div>
      )}
    </div>
  );
}
