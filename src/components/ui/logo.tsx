import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon" | "text";
  theme?: "light" | "dark";
}

const iconSizes = { sm: 28, md: 36, lg: 50 };
const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/images/winipat-logo.png"
      alt="Winipat"
      width={size}
      height={size}
      priority
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

export function Logo({ className, size = "md", variant = "full", theme = "dark" }: LogoProps) {
  const textColor = theme === "dark" ? "text-white" : "text-midnight";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {variant !== "text" && <LogoIcon size={iconSizes[size]} />}
      {variant !== "icon" && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-bold font-[family-name:var(--font-sora)] tracking-tight",
              textSizes[size],
              textColor,
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

// Kept as a backwards-compatible re-export in case any callers import it directly.
export { LogoIcon as ShieldIcon };
