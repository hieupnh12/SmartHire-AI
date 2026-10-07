import type { CvLanguage } from "@/api/types/cv";
import { useCvReadOnly } from "./CvReadOnlyContext";

/** Stored levels: 2 familiar, 4 intermediate, 5 proficient; older 1..5 dot values map by range. */
const steps = [0, 2, 4, 5] as const;

const labels: Record<CvLanguage, Record<"familiar" | "intermediate" | "proficient", string>> = {
  vi: { familiar: "Biết", intermediate: "Khá", proficient: "Thành thạo" },
  en: { familiar: "Familiar", intermediate: "Intermediate", proficient: "Proficient" },
};

export function skillLevelLabel(level: number, language: CvLanguage) {
  if (level <= 0) return "";
  if (level >= 5) return labels[language].proficient;
  if (level >= 3) return labels[language].intermediate;
  return labels[language].familiar;
}

const stepIndex = (level: number) => (level <= 0 ? 0 : level >= 5 ? 3 : level >= 3 ? 2 : 1);

/** Click cycles: none → familiar → intermediate → proficient → none. */
export function SkillLevel({ value, language, onChange, inverse }: {
  value: number;
  language: CvLanguage;
  onChange: (value: number) => void;
  inverse: boolean;
}) {
  const readOnly = useCvReadOnly();
  const text = skillLevelLabel(value, language);
  if (readOnly) return text ? <span className={`shrink-0 text-[0.85em] font-semibold ${inverse ? "text-white/85" : "text-[var(--color-primary)]"}`}>{text}</span> : null;
  return (
    <button
      type="button"
      title="Bấm để đổi mức độ"
      aria-label={`Mức độ: ${text || "chưa chọn"}`}
      onClick={() => onChange(steps[(stepIndex(value) + 1) % steps.length])}
      className={`shrink-0 rounded-full border px-2 text-[0.85em] font-semibold ${text ? "" : "cv-print-hidden"} ${inverse ? "border-white/40 text-white/90" : "border-[color-mix(in_srgb,var(--color-primary)_35%,white)] text-[var(--color-primary)]"}`}
    >
      {text || "+ Mức độ"}
    </button>
  );
}
