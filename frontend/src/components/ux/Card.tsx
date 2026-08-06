import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/** Enterprise SaaS card: soft shadow, rounded, clean surface. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-surface-card p-5 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}
