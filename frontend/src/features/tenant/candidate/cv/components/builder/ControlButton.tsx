import type { LucideIcon } from "lucide-react";

export function ControlButton({ label, icon: Icon, onClick, disabled = false, danger = false }: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-[var(--color-primary)]"}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}
