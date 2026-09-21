import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export type RankingSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
};

type Props = {
  value: string;
  options: RankingSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
};

const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi");

export function RankingSelect({ value, options, onChange, ariaLabel, placeholder = "Chọn một giá trị", disabled = false, compact = false, searchable = false, searchPlaceholder = "Tìm kiếm…" }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const selected = options[selectedIndex];
  const filteredOptions = searchable && query.trim()
    ? options.filter((option) => normalizeSearch(`${option.label} ${option.description ?? ""}`).includes(normalizeSearch(query.trim())))
    : options;

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, filteredOptions.findIndex((option) => option.value === value)));
    if (searchable) requestAnimationFrame(() => searchInput.current?.focus());
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, searchable]);

  useEffect(() => setActiveIndex(0), [query]);

  const choose = (index: number) => {
    const option = filteredOptions[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const isSearchInput = event.currentTarget instanceof HTMLInputElement;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => event.key === "ArrowDown"
        ? (filteredOptions.length === 0 ? 0 : Math.min(filteredOptions.length - 1, current + 1))
        : Math.max(0, current - 1));
    } else if ((event.key === "Enter" || (!isSearchInput && event.key === " ")) && open) {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Home" && open && !isSearchInput) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && open && !isSearchInput) {
      event.preventDefault();
      setActiveIndex(Math.max(0, filteredOptions.length - 1));
    }
  };

  return <div ref={root} className="relative min-w-0">
    <button
      type="button"
      role="combobox"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-controls={`${id}-listbox`}
      aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={handleKeyDown}
      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-left font-medium shadow-sm transition-[border-color,box-shadow] hover:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "min-h-11 px-3 py-2 text-xs" : "min-h-12 px-4 py-3 text-sm"}`}
    >
      <span className={`min-w-0 flex-1 truncate ${selected ? "text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)]"}`}>{selected?.label ?? placeholder}</span>
      {selected?.badge && <span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-hover)]">{selected.badge}</span>}
      <ChevronDown className={`size-4 shrink-0 text-[var(--color-on-surface-variant)] transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>

    {open && <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[0_20px_50px_-18px_rgba(15,23,42,0.28)]">
      {searchable && <div className="border-b border-[var(--color-border-default)] p-2"><label className="relative block"><span className="sr-only">{searchPlaceholder}</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder={searchPlaceholder} className="min-h-11 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2 pl-9 pr-10 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" />{query && <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)]" aria-label="Xóa từ khóa"><X className="size-4" aria-hidden="true" /></button>}</label><p className="px-1 pt-2 text-xs text-[var(--color-on-surface-variant)]">{filteredOptions.length} kết quả</p></div>}
      <div id={`${id}-listbox`} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto p-2">
      {filteredOptions.map((option, index) => {
        const isSelected = option.value === value;
        const isActive = index === activeIndex;
        return <button
          id={`${id}-option-${index}`}
          key={option.value}
          type="button"
          role="option"
          aria-selected={isSelected}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(index)}
          className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-surface-container-low)]"}`}
        >
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"}`}><Check className={`size-4 ${isSelected ? "opacity-100" : "opacity-0"}`} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{option.label}</span>{option.description && <span className="mt-0.5 block truncate text-xs text-[var(--color-on-surface-variant)]">{option.description}</span>}</span>
          {option.badge && <span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary-hover)]">{option.badge}</span>}
        </button>;
      })}
      {filteredOptions.length === 0 && <div className="px-4 py-8 text-center"><Search className="mx-auto size-6 text-[var(--color-outline)]" aria-hidden="true" /><p className="mt-2 text-sm font-semibold">Không tìm thấy vị trí</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Thử tên Job hoặc từ khóa khác.</p></div>}
      </div>
    </div>}
  </div>;
}
