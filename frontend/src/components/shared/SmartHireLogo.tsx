import { useState } from "react";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartHireLogoProps {
  variant?: "full" | "icon";
  tone?: "light" | "dark";
  className?: string;
}

export function SmartHireLogo({
  variant = "full",
  tone = "light",
  className,
}: SmartHireLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="inline-flex items-center gap-2.5 select-none">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white shadow-sm">
          <BrainCircuit className="size-5" aria-hidden="true" />
        </span>
        {variant === "full" && (
          <span
            className={cn(
              "font-display text-xl font-semibold tracking-tight",
              tone === "dark" ? "text-white" : "text-slate-900",
            )}
          >
            SmartHire<span className={tone === "dark" ? "text-blue-400" : "text-blue-600"}>.AI</span>
          </span>
        )}
      </span>
    );
  }

  const src = variant === "icon" ? "/logo-smarthire-icon.png" : "/logo-smarthire.png";
  const img = (
    <img
      src={src}
      alt="SmartHire AI"
      onError={() => setFailed(true)}
      className={cn(
        "w-auto object-contain select-none transition-transform duration-200 group-hover:scale-105",
        variant === "icon" ? "h-9" : "h-9 sm:h-10",
        className,
      )}
    />
  );

  if (tone === "dark") {
    return (
      <span className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 shadow-sm">
        {img}
      </span>
    );
  }

  return img;
}

