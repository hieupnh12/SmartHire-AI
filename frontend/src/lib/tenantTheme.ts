import type { CSSProperties } from "react";

export interface TenantThemeConfig {
  code: string;
  name: string;
  tagline: string;
  primaryColorBtn: string;
  primaryHoverBtn: string;
  primaryText: string;
  primaryBgLight: string;
  primaryGradient: string;
  badgeBg: string;
  heroImage: string;
  cultureImage: string;
  accentBadge: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primarySubtle: string;
  primaryShadow: string;
}

const COLOR_PRESETS: Omit<TenantThemeConfig, "code" | "name" | "tagline">[] = [
  { primaryColorBtn: "bg-teal-600 hover:bg-teal-700", primaryHoverBtn: "hover:bg-teal-700", primaryText: "text-teal-600", primaryBgLight: "bg-teal-50", primaryGradient: "from-teal-600 via-cyan-600 to-emerald-600", badgeBg: "bg-teal-500/10 text-teal-600 border-teal-500/20", heroImage: "/acme_tech_hero.png", cultureImage: "/acme_culture.png", accentBadge: "Teal Cyber Tech", primary: "#0d9488", primaryHover: "#0f766e", primarySoft: "rgba(13, 148, 136, 0.10)", primarySubtle: "#f0fdfa", primaryShadow: "rgba(13, 148, 136, 0.65)" },
  { primaryColorBtn: "bg-indigo-600 hover:bg-indigo-700", primaryHoverBtn: "hover:bg-indigo-700", primaryText: "text-indigo-600", primaryBgLight: "bg-indigo-50", primaryGradient: "from-indigo-600 via-purple-600 to-blue-600", badgeBg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", heroImage: "/acme_tech_hero.png", cultureImage: "/acme_culture.png", accentBadge: "Royal Indigo Tech", primary: "#4f46e5", primaryHover: "#4338ca", primarySoft: "rgba(79, 70, 229, 0.10)", primarySubtle: "#eef2ff", primaryShadow: "rgba(79, 70, 229, 0.60)" },
  { primaryColorBtn: "bg-amber-600 hover:bg-amber-700", primaryHoverBtn: "hover:bg-amber-700", primaryText: "text-amber-600", primaryBgLight: "bg-amber-50", primaryGradient: "from-amber-600 via-orange-600 to-yellow-500", badgeBg: "bg-amber-500/10 text-amber-600 border-amber-500/20", heroImage: "/acme_tech_hero.png", cultureImage: "/acme_culture.png", accentBadge: "Sunset Amber Tech", primary: "#b45309", primaryHover: "#92400e", primarySoft: "rgba(180, 83, 9, 0.10)", primarySubtle: "#fffbeb", primaryShadow: "rgba(180, 83, 9, 0.55)" },
  { primaryColorBtn: "bg-rose-600 hover:bg-rose-700", primaryHoverBtn: "hover:bg-rose-700", primaryText: "text-rose-600", primaryBgLight: "bg-rose-50", primaryGradient: "from-rose-600 via-red-600 to-pink-600", badgeBg: "bg-rose-500/10 text-rose-600 border-rose-500/20", heroImage: "/acme_tech_hero.png", cultureImage: "/acme_culture.png", accentBadge: "Ruby Crimson Tech", primary: "#e11d48", primaryHover: "#be123c", primarySoft: "rgba(225, 29, 72, 0.10)", primarySubtle: "#fff1f2", primaryShadow: "rgba(225, 29, 72, 0.55)" },
  { primaryColorBtn: "bg-emerald-600 hover:bg-emerald-700", primaryHoverBtn: "hover:bg-emerald-700", primaryText: "text-emerald-600", primaryBgLight: "bg-emerald-50", primaryGradient: "from-emerald-600 via-teal-600 to-green-600", badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", heroImage: "/acme_tech_hero.png", cultureImage: "/acme_culture.png", accentBadge: "Vibrant Emerald Tech", primary: "#059669", primaryHover: "#047857", primarySoft: "rgba(5, 150, 105, 0.10)", primarySubtle: "#ecfdf5", primaryShadow: "rgba(5, 150, 105, 0.55)" },
  { primaryColorBtn: "bg-violet-600 hover:bg-violet-700", primaryHoverBtn: "hover:bg-violet-700", primaryText: "text-violet-600", primaryBgLight: "bg-violet-50", primaryGradient: "from-violet-600 via-purple-600 to-fuchsia-600", badgeBg: "bg-violet-500/10 text-violet-600 border-violet-500/20", heroImage: "/acme_tech_hero.png", cultureImage: "/acme_culture.png", accentBadge: "Deep Violet Tech", primary: "#7c3aed", primaryHover: "#6d28d9", primarySoft: "rgba(124, 58, 237, 0.10)", primarySubtle: "#f5f3ff", primaryShadow: "rgba(124, 58, 237, 0.55)" },
  { primaryColorBtn: "bg-blue-600 hover:bg-blue-700", primaryHoverBtn: "hover:bg-blue-700", primaryText: "text-blue-600", primaryBgLight: "bg-blue-50", primaryGradient: "from-blue-600 via-cyan-600 to-sky-600", badgeBg: "bg-blue-500/10 text-blue-600 border-blue-500/20", heroImage: "/acme_tech_hero.png", cultureImage: "/acme_culture.png", accentBadge: "Electric Blue Tech", primary: "#2563eb", primaryHover: "#1d4ed8", primarySoft: "rgba(37, 99, 235, 0.10)", primarySubtle: "#eff6ff", primaryShadow: "rgba(37, 99, 235, 0.60)" },
];

export function getTenantTheme(code: string): TenantThemeConfig {
  const cleanCode = (code || "acme").toLowerCase();
  let hash = 0;
  for (let index = 0; index < cleanCode.length; index += 1) {
    hash = cleanCode.charCodeAt(index) + ((hash << 5) - hash);
  }
  const preset = COLOR_PRESETS[Math.abs(hash) % COLOR_PRESETS.length];
  return {
    code: cleanCode,
    name: `${cleanCode.toUpperCase()}`,
    tagline: "Dẫn đầu Giải pháp Công nghệ",
    ...preset,
  };
}

export function getTenantThemeStyle(theme: TenantThemeConfig): CSSProperties {
  return {
    "--color-primary": theme.primary,
    "--color-primary-hover": theme.primaryHover,
    "--color-primary-container": theme.primary,
    "--color-primary-soft": theme.primarySoft,
    "--color-primary-subtle": theme.primarySubtle,
    "--color-primary-shadow": theme.primaryShadow,
    "--color-surface-container-low": theme.primarySubtle,
    "--color-surface-container": theme.primarySubtle,
    "--container-blue": theme.primarySoft,
    "--color-brand-primary": theme.primary,
    "--color-brand-primary-hover": theme.primaryHover,
    "--color-brand-accent": theme.primary,
    "--color-surface-muted": theme.primarySubtle,
    "--color-border-focus": theme.primary,
    "--tw-ring-color": theme.primarySoft,
  } as CSSProperties;
}
