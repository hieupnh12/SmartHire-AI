import React from "react";
import {
  Sparkles,
  Users,
  Award,
  Globe,
  Zap,
  Briefcase,
  HeartHandshake,
  Laptop,
  TrendingUp,
  Coffee,
  ShieldCheck,
  CheckCircle2,
  Code,
  Layers,
  Cpu,
} from "lucide-react";

export const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Award,
  Globe,
  Zap,
  Briefcase,
  HeartHandshake,
  Laptop,
  TrendingUp,
  Coffee,
  ShieldCheck,
  CheckCircle2,
  Code,
  Layers,
  Cpu,
};

export function renderIcon(name: string, className?: string) {
  const IconComponent = ICON_MAP[name] || Sparkles;
  return <IconComponent className={className || "w-5 h-5"} />;
}
