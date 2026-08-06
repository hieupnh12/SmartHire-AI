import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-primary text-[var(--color-text-inverse)] hover:bg-brand-primary-hover shadow-sm",
  secondary:
    "bg-surface-card text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-surface-muted",
  ghost: "bg-transparent text-[var(--color-text-secondary)] hover:bg-surface-muted",
  danger: "bg-[var(--color-status-danger)] text-[var(--color-text-inverse)] hover:opacity-90",
  ai: "bg-brand-accent text-[var(--color-text-inverse)] hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

/** Large tap targets, clear focus ring — UX / WCAG friendly. */
export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-colors duration-[var(--motion-fast)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
