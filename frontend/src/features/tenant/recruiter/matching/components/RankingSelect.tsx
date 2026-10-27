import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type RankingSelectOption = {
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
      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white text-left font-medium transition-all hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs ${compact ? "h-8 px-2.5 text-xs" : "h-8.5 px-3 text-[13px]"}`}
    >
      <span className={`min-w-0 flex-1 truncate ${selected ? "text-slate-900" : "text-slate-500"}`}>{selected?.label ?? placeholder}</span>
      {selected?.badge && <span className="shrink-0 rounded-full bg-brand-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand-primary">{selected.badge}</span>}
      <ChevronDown className={`size-3.5 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>

    {open && <div className="absolute left-0 top-[calc(100%+0.25rem)] z-50 min-w-[220px] max-w-xs w-max overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {searchable && <div className="border-b border-slate-100 p-2"><label className="relative block"><span className="sr-only">{searchPlaceholder}</span><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder={searchPlaceholder} className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-8 pr-8 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary" />{query && <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Xóa từ khóa"><X className="size-3.5" aria-hidden="true" /></button>}</label><p className="px-1 pt-1.5 text-[11px] text-slate-500">{filteredOptions.length} kết quả</p></div>}
      <div id={`${id}-listbox`} role="listbox" aria-label={ariaLabel} className="max-h-56 overflow-y-auto p-1 [scrollbar-width:thin]">
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
          className={`flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${isActive ? "bg-brand-primary/10 text-brand-primary" : "text-slate-700 hover:bg-slate-100"}`}
        >
          <Check className={`size-3.5 shrink-0 text-brand-primary ${isSelected ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{option.label}</span>{option.description && <span className="mt-0.5 block truncate text-[11px] text-slate-400">{option.description}</span>}</span>
          {option.badge && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">{option.badge}</span>}
        </button>;
      })}
      {filteredOptions.length === 0 && <div className="px-4 py-6 text-center"><Search className="mx-auto size-5 text-slate-300" aria-hidden="true" /><p className="mt-1.5 text-xs font-semibold text-slate-700">Không tìm thấy</p><p className="mt-0.5 text-[11px] text-slate-400">Thử từ khóa khác.</p></div>}
      </div>
    </div>}
  </div>;
}
