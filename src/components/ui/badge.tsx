import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "gold" | "royal";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-mist text-slate",
  success: "bg-emerald/10 text-emerald-dark",
  warning: "bg-warning/10 text-amber-700",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
  gold: "bg-gold/20 text-amber-800",
  royal: "bg-royal/10 text-royal",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[--radius-full] px-3 py-1 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
