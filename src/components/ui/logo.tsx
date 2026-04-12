import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon" | "text";
  theme?: "light" | "dark";
}

const iconSizes = { sm: 26, md: 34, lg: 46 };
const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

function ShieldIcon({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="shield-bg" x1="10" y1="5" x2="70" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="45%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      {/* Shield shape */}
      <path
        d="M40 6L12 20v18c0 17.6 11.9 34 28 40 16.1-6 28-22.4 28-40V20L40 6z"
        fill="url(#shield-bg)"
      />
      {/* W + checkmark swoosh */}
      <path
        d="M24 34l8 16 8-12 8 12 8-16"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M32 50l-4 6"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

export function Logo({ className, size = "md", variant = "full", theme = "dark" }: LogoProps) {
  const textColor = theme === "dark" ? "text-white" : "text-midnight";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {variant !== "text" && <ShieldIcon size={iconSizes[size]} />}
      {variant !== "icon" && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-bold font-[family-name:var(--font-sora)] tracking-tight",
              textSizes[size],
            )}
          >
            <span className="text-violet">wini</span>
            <span className="text-teal">pat</span>
          </span>
          {size === "lg" && (
            <span className={cn("text-[10px] tracking-wide mt-0.5", theme === "dark" ? "text-white/50" : "text-slate-light")}>
              Trusted Commerce, Delivered.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { ShieldIcon };
