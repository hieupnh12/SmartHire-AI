/**
 * Icon names must match DESIGN.md §5.1 (Google Stitch export).
 * Swap implementation to Stitch SVGs under src/assets/icons when available.
 */
const ICON_MAP = {
  check: "✓",
  close: "×",
  login: "→",
  person_add: "+",
  upload_file: "⇪",
  auto_awesome: "✦",
  mic: "◉",
  grade: "★",
  dashboard: "▦",
  quiz: "?",
  edit: "✎",
  add: "+",
  search: "⌕",
} as const;

export type IconName = keyof typeof ICON_MAP;

type IconProps = {
  name: IconName;
  size?: 16 | 20 | 24;
  className?: string;
};

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <span
      className={className}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden
    >
      {ICON_MAP[name]}
    </span>
  );
}
