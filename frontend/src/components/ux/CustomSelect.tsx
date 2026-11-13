import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  dotClassName?: string;
  count?: number;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  icon?: ReactNode;
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  icon,
  ariaLabel,
  className,
  menuClassName,
  disabled = false,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  }>({
    top: 0,
    left: 0,
    width: 220,
  });

  const selected = options.find((opt) => opt.value === value);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 6;
      const viewportPadding = 12;
      const estimatedMenuHeight = Math.min(options.length * 38 + 14, 260);
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;

      const openTop = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
      const actualHeight = menuRef.current?.offsetHeight || estimatedMenuHeight;
      const width = Math.max(rect.width, 210);
      const left = Math.max(
        viewportPadding,
        Math.min(window.innerWidth - width - viewportPadding, rect.left),
      );
      const top = openTop
        ? Math.max(viewportPadding, rect.top - actualHeight - gap)
        : Math.min(window.innerHeight - actualHeight - viewportPadding, rect.bottom + gap);

      setCoords({
        top,
        left,
        width,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex w-full min-h-10 items-center justify-between gap-2.5 rounded-xl border bg-white px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all focus-visible:outline-none",
          open
            ? "border-blue-500 text-slate-900 ring-3 ring-blue-100"
            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/40",
          disabled && "cursor-not-allowed bg-slate-50 opacity-60",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          {selected?.dotClassName && (
            <span className={cn("size-2 shrink-0 rounded-full", selected.dotClassName)} />
          )}
          <span className={cn("truncate text-left", selected ? "text-slate-700" : "text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
          {selected && typeof selected.count === "number" && (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {selected.count}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform duration-150",
            open && "rotate-180 text-blue-600",
          )}
          aria-hidden="true"
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className={cn(
              "z-[9999] max-h-64 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_14px_34px_-8px_rgba(15,23,42,0.18)] backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150",
              menuClassName,
            )}
          >
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {opt.dotClassName && (
                        <span className={cn("size-2 shrink-0 rounded-full", opt.dotClassName)} />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      {typeof opt.count === "number" && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            isSelected
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {opt.count}
                        </span>
                      )}
                      {isSelected && <Check className="size-3.5 text-blue-600" aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
