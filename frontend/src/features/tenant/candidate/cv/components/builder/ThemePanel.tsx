import { Check } from "lucide-react";
import type { CvBuilderTheme, CvFontKey, CvFontSize, CvLineHeight } from "@/api/types/cv";
import { cvColorPresets, cvFonts, cvFontSizes, cvLineHeights } from "../../constants/cvTheme";
import { defaultCvTheme } from "../../utils/createDefaultCv";

type PanelProps = { theme: CvBuilderTheme | undefined; onChange: (patch: Partial<CvBuilderTheme>) => void };

function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: Array<{ key: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-slate-600">{label}</legend>
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={value === option.key}
            onClick={() => onChange(option.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${value === option.key ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function FontPanel({ theme, onChange }: PanelProps) {
  const value = { ...defaultCvTheme, ...theme };
  const fonts: Array<{ key: CvFontKey | null; label: string; family: string }> = [
    { key: null, label: "Theo mẫu CV", family: "inherit" },
    ...(Object.keys(cvFonts) as CvFontKey[]).map((key) => ({ key, ...cvFonts[key] })),
  ];
  return (
    <div className="space-y-4">
      <ul className="space-y-1" aria-label="Phông chữ">
        {fonts.map((font) => (
          <li key={font.key ?? "template"}>
            <button
              type="button"
              aria-pressed={value.font === font.key}
              onClick={() => onChange({ font: font.key })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${value.font === font.key ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] text-[var(--color-primary)]" : "text-slate-700 hover:bg-slate-50"}`}
              style={{ fontFamily: font.family }}
            >
              {font.label}
              {value.font === font.key && <Check className="size-4" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <Segmented<CvFontSize> label="Cỡ chữ" options={(Object.keys(cvFontSizes) as CvFontSize[]).map((key) => ({ key, label: cvFontSizes[key].label }))} value={value.fontSize} onChange={(fontSize) => onChange({ fontSize })} />
      <Segmented<CvLineHeight> label="Giãn dòng" options={(Object.keys(cvLineHeights) as CvLineHeight[]).map((key) => ({ key, label: cvLineHeights[key].label }))} value={value.lineHeight} onChange={(lineHeight) => onChange({ lineHeight })} />
    </div>
  );
}

export function ColorPanel({ theme, onChange }: PanelProps) {
  const value = { ...defaultCvTheme, ...theme };
  const swatch = (color: string | null, title: string) => {
    const active = value.color === color;
    return (
      <button
        key={color ?? "tenant"}
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        onClick={() => onChange({ color })}
        className={`grid size-8 place-items-center rounded-full ring-offset-2 transition-transform hover:scale-110 ${active ? "ring-2 ring-slate-800" : ""}`}
        style={{ background: color ?? "var(--color-primary)" }}
      >
        {active && <Check className="size-4 text-white" aria-hidden="true" />}
      </button>
    );
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {swatch(null, "Màu doanh nghiệp")}
        {cvColorPresets.map((color) => swatch(color, color))}
        <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-slate-300 text-xs font-bold text-slate-500" title="Chọn màu khác">
          +
          <input type="color" value={value.color ?? "#2563eb"} onChange={(event) => onChange({ color: event.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Chọn màu khác" />
        </label>
      </div>
      <button type="button" onClick={() => onChange(defaultCvTheme)} className="text-xs font-semibold text-slate-500 hover:text-[var(--color-primary)]">Khôi phục giao diện mặc định</button>
    </div>
  );
}
