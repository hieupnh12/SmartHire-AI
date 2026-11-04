import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
  badge?: ReactNode;
  icon?: LucideIcon;
  dotColor?: string;
};

type Props<T extends string = string> = {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  icon?: LucideIcon;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  align?: "left" | "right" | "auto";
};

export function RecruiterFilterDropdown<T extends string = string>({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  disabled = false,
  placeholder,
  className,
  align = "auto",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [effectiveAlign, setEffectiveAlign] = useState<"left" | "right">(
    align === "right" ? "right" : "left",
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];
  const isFiltered = value !== "ALL" && value !== "";

  useEffect(() => {
    if (!open) return;

    if (align === "left" || align === "right") {
      setEffectiveAlign(align);
    } else if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceOnRight = window.innerWidth - rect.left;
      // Nếu khoảng trống bên phải nút < 260px thì bung sang bên trái (căn lề phải)
      if (spaceOnRight < 260 || rect.right > window.innerWidth - 100) {
        setEffectiveAlign("right");
      } else {
        setEffectiveAlign("left");
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, align]);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex min-h-9 items-center justify-between gap-2 rounded-xl border bg-white px-3 py-1.5 text-xs font-medium transition-all shadow-xs outline-none",
          "focus-visible:ring-2 focus-visible:ring-brand-primary/20",
          disabled && "cursor-not-allowed opacity-50 bg-slate-50",
          open
            ? "border-brand-primary ring-2 ring-brand-primary/15 bg-white shadow-sm"
            : isFiltered
              ? "border-brand-primary/70 bg-[var(--color-primary-soft)]/40 text-brand-primary font-semibold"
              : "border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:border-brand-primary/50 hover:bg-[var(--color-surface-alt)]/60",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && (
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                isFiltered ? "text-brand-primary" : "text-[var(--color-outline)]",
              )}
              aria-hidden="true"
            />
          )}
          {selectedOption?.dotColor && (
            <span
              className={cn("size-2 shrink-0 rounded-full", selectedOption.dotColor)}
              aria-hidden="true"
            />
          )}
          <span className="truncate max-w-[150px] sm:max-w-[200px]">
            {selectedOption?.label || placeholder || label}
          </span>
        </span>

        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-[var(--color-outline)] transition-transform duration-200",
            open && "rotate-180 text-brand-primary",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 max-h-64 min-w-[210px] w-max max-w-[min(300px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--color-border-default)] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] animate-in fade-in-0 zoom-in-95 duration-150 [scrollbar-width:thin]",
            effectiveAlign === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-outline)]">
            {label}
          </div>
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              const OptionIcon = option.icon;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                    isSelected
                      ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/20"
                      : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-alt)]",
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {OptionIcon && (
                      <OptionIcon
                        className={cn("size-3.5 shrink-0", isSelected ? "text-brand-primary" : "text-slate-400")}
                        aria-hidden="true"
                      />
                    )}
                    {option.dotColor && (
                      <span className={cn("size-2 shrink-0 rounded-full", option.dotColor)} aria-hidden="true" />
                    )}
                    <span className="truncate">{option.label}</span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge}
                    {isSelected && (
                      <Check className="size-3.5 text-brand-primary" aria-hidden="true" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
