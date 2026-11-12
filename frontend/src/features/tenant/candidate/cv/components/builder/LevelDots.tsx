import { useT } from "@/i18n";
import { useCvReadOnly } from "./CvReadOnlyContext";

const LEVELS = [1, 2, 3, 4, 5] as const;
const levelKeys = ["unrated", "basic", "intermediate", "good", "veryGood", "proficient"] as const;

/** Click a dot to set the level; clicking the current level clears it. */
export function LevelDots({ value, onChange, label, inverse }: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  inverse: boolean;
}) {
  const t = useT();
  const readOnly = useCvReadOnly();
  const filled = inverse ? "bg-white" : "bg-[var(--color-primary)]";
  const empty = inverse ? "bg-white/30" : "bg-[color-mix(in_srgb,var(--color-primary)_20%,white)]";
  return (
    <div role="radiogroup" aria-label={label} title={t(`candidate.cv.skillLevel.dots.${levelKeys[value] ?? "unrated"}`)} className={`flex shrink-0 items-center gap-1 ${value ? "" : "cv-print-empty"}`}>
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          role="radio"
          aria-checked={value === level}
          aria-label={t(`candidate.cv.skillLevel.dots.${levelKeys[level]}`)}
          disabled={readOnly}
          onClick={() => onChange(value === level ? 0 : level)}
          className={`size-2.5 rounded-full transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)] ${level <= value ? filled : empty}`}
        />
      ))}
    </div>
  );
}
