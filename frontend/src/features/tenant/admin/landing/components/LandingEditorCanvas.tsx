import React, { useState, useEffect } from "react";
import {
  Palette,
  Search,
  ArrowRight,
  LogIn,
  Building2,
  Upload,
  Plus,
  Trash2,
  Mail,
  Phone,
  Building,
  Linkedin,
  Facebook,
  Github,
  Globe,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Pause,
  MapPin,
  Laptop,
  Briefcase,
  Clock,
  SlidersHorizontal,
  Quote,
  FileText,
} from "lucide-react";
import { useT } from "@/i18n";
import type { LandingPageConfig } from "../types/landing";
import { renderIcon } from "../utils/icons";
import "@/features/tenant/candidate/jobs/career-page.css";

const AVAILABLE_ICONS = [
  "Users",
  "Award",
  "Globe",
  "Zap",
  "Briefcase",
  "HeartHandshake",
  "Laptop",
  "TrendingUp",
  "Coffee",
  "ShieldCheck",
  "CheckCircle2",
  "Code",
  "Layers",
  "Cpu",
  "Sparkles",
];

interface LandingEditorCanvasProps {
  config: LandingPageConfig;
  brandName: string;
  viewMode: "desktop" | "tablet" | "mobile";
  showVisualControls: boolean;
  activeTab: string;
  isDrawerOpen: boolean;
  openDrawerTab: (tabId: string) => void;
  updateHeader: (patch: Partial<LandingPageConfig["header"]>) => void;
  updateTheme: (patch: Partial<LandingPageConfig["theme"]>) => void;
  updateHero: (patch: Partial<LandingPageConfig["hero"]>) => void;
  updateAbout: (patch: Partial<LandingPageConfig["about"]>) => void;
  updateBenefits: (patch: Partial<LandingPageConfig["benefits"]>) => void;
  updateTechStack: (patch: Partial<LandingPageConfig["techStack"]>) => void;
  updateTestimonials: (patch: Partial<LandingPageConfig["testimonials"]>) => void;
  updateFooter: (patch: Partial<LandingPageConfig["footer"]>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void) => void;
  isUploading: boolean;
  inlineNewTag: string;
  setInlineNewTag: (val: string) => void;
  handleAddInlineTag: () => void;
}

export function LandingEditorCanvas(props: LandingEditorCanvasProps) {
  const t = useT();
  const {
    config,
    brandName,
    viewMode,
    showVisualControls,
    activeTab,
    isDrawerOpen,
    openDrawerTab,
    updateHeader,
    updateHero,
    updateAbout,
    updateBenefits,
    updateTestimonials,
    updateFooter,
    handleFileUpload,
  } = props;

  const [editingIconTarget, setEditingIconTarget] = useState<{ type: "stat" | "benefit"; index: number } | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".icon-picker-container")) {
        setEditingIconTarget(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const primary = config.theme.primaryColor || "#008060";
  const primaryHover = config.theme.primaryHover || primary;
  const secondary = config.theme.secondaryColor || "#505f76";
  const isDarkHero = config.theme.darkModeHero !== false;
  const isMobile = viewMode === "mobile";
  const isTablet = viewMode === "tablet";

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const validStats = (config.about.stats || []).filter((s) => s.value?.trim() || s.label?.trim());
  const validBenefits = (config.benefits.items || []).filter((b) => b.title?.trim() || b.description?.trim());
  const validTestimonials = (config.testimonials.items || []).filter((item) => item.name?.trim() || item.quote?.trim());

  const dynamicThemeStyle: React.CSSProperties = {
    fontFamily: config.theme.fontFamily || "Inter",
    "--color-primary": primary,
    "--color-primary-hover": primaryHover,
    "--color-brand-primary": primary,
    "--color-brand-primary-hover": primaryHover,
    "--color-secondary": secondary,
    "--color-brand-secondary": secondary,
    "--career-hero": isDarkHero ? primary : "#ffffff",
    "--career-secondary": secondary,
    "--color-surface-alt": "#f4f6f8",
    "--color-border-default": "#e2e8f0",
    "--color-primary-subtle": `${primary}18`,
  } as React.CSSProperties;

  // Helper to check if a section is currently active
  const isSectionActive = (tabId: string) => isDrawerOpen && activeTab === tabId;

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 p-2 sm:p-5 flex justify-center items-start">
      <div
        className={`career-page tenant-workspace-theme transition-all duration-300 bg-[var(--color-surface-alt,#f4f6f8)] text-slate-900 shadow-2xl relative select-text ${
          isMobile
            ? "w-[390px] min-h-[844px] rounded-[44px] border-[10px] border-slate-200 ring-4 ring-slate-100 my-4 text-xs overflow-hidden"
            : isTablet
              ? "w-[768px] min-h-[1024px] rounded-[32px] border-[10px] border-slate-200 ring-4 ring-slate-100 my-4 text-sm overflow-hidden"
              : "w-full max-w-[1440px] rounded-2xl border border-slate-200 text-sm overflow-hidden"
        }`}
        style={dynamicThemeStyle}
      >
        {/* ================= HEADER SECTION ================= */}
        <header
          className={`sticky top-0 z-30 bg-white border-b border-[var(--color-border-default,#e2e8f0)] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-sm relative group transition-all duration-200 ${
            isSectionActive("header")
              ? "ring-2 ring-cyan-500 ring-offset-2 z-40 bg-cyan-50/10"
              : ""
          }`}
        >
          {/* Edit Badge Pill */}
          {showVisualControls && (
            <div className="absolute top-2 right-4 z-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawerTab("theme");
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold shadow hover:bg-slate-800 transition-transform active:scale-95"
              >
                <Palette className="w-3 h-3 text-cyan-400" />
                <span>{t("tenantAdmin.landing.canvas.editColorsFont")}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawerTab("header");
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-600 text-white text-[11px] font-semibold shadow hover:bg-cyan-700 transition-transform active:scale-95"
              >
                <Edit3 className="w-3 h-3" />
                <span>{t("tenantAdmin.landing.canvas.editHeader")}</span>
              </button>
            </div>
          )}

          {isSectionActive("header") && (
            <div className="absolute -top-3 left-6 z-40 bg-cyan-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <Edit3 className="w-2.5 h-2.5" />
              <span>{t("tenantAdmin.landing.canvas.editingHeader")}</span>
            </div>
          )}

          {/* Logo & Brand Info */}
          <div className="flex items-center gap-3">
            {config.header.logoImageUrl ? (
              <div className="relative group/logo">
                <img
                  src={config.header.logoImageUrl}
                  alt={t("tenantAdmin.landing.canvas.logoAlt")}
                  className="h-11 max-w-36 object-contain rounded"
                />
                {showVisualControls && (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => updateHeader({ logoImageUrl: url }))}
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="relative group/logo">
                <div
                  className="size-11 rounded-xl text-white font-bold flex items-center justify-center text-lg shadow-sm"
                  style={{ backgroundColor: primary }}
                >
                  {brandName.charAt(0)}
                </div>
                {showVisualControls && (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded-xl cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => updateHeader({ logoImageUrl: url }))}
                    />
                  </label>
                )}
              </div>
            )}

            <div>
              <span className="block font-bold text-slate-800 text-lg leading-tight tracking-tight">{brandName}</span>
              <span
                contentEditable={showVisualControls}
                suppressContentEditableWarning
                onBlur={(e) => updateHeader({ slogan: e.currentTarget.textContent || "" })}
                className={`block text-[11px] text-slate-500 outline-none transition-all ${
                  showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                }`}
                title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditSlogan") : undefined}
              >
                {config.header.slogan || t("tenantAdmin.landing.canvas.defaultSlogan")}
              </span>
            </div>
          </div>

          {/* Navigation Mega Menus */}
          {!isMobile && (
            <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-700">
              <span className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors">
                {t("tenantAdmin.landing.canvas.navJobs")} <ChevronDown className="size-3.5 text-slate-400" />
              </span>
              <span className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors">
                {t("tenantAdmin.landing.canvas.navCreateCv")} <ChevronDown className="size-3.5 text-slate-400" />
              </span>
              <span className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors">
                {t("tenantAdmin.landing.canvas.navTools")} <ChevronDown className="size-3.5 text-slate-400" />
              </span>
              <span className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors">
                {t("tenantAdmin.landing.canvas.navAbout")} <ChevronDown className="size-3.5 text-slate-400" />
              </span>
            </div>
          )}

          {/* Top Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center size-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs shadow-sm"
              title={t("tenantAdmin.landing.canvas.switchLanguageTitle")}
            >
              <Globe className="size-4" />
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              style={{ backgroundColor: primary }}
            >
              <LogIn className="size-3.5" />
              <span>{t("tenantAdmin.landing.canvas.login")}</span>
            </button>
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Building2 className="size-3.5 text-slate-500" />
              <span>{t("tenantAdmin.landing.canvas.recruiterPortal")}</span>
            </button>
          </div>
        </header>

        {/* ================= SECTION 1: DISCOVERY HERO ================= */}
        <section
          className={`career-discovery-hero px-4 py-7 sm:px-6 sm:py-9 lg:px-8 relative group transition-all duration-200 ${
            isSectionActive("hero")
              ? "ring-2 ring-cyan-400 ring-offset-2 shadow-2xl"
              : ""
          }`}
        >
          {showVisualControls && (
            <div className="absolute top-3 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawerTab("hero");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 text-white text-xs font-semibold shadow-xl hover:bg-slate-800 transition-transform active:scale-95 border border-white/20"
              >
                <Edit3 className="size-3.5 text-cyan-400" />
                <span>{t("tenantAdmin.landing.canvas.editHeroBanner")}</span>
              </button>
            </div>
          )}

          {isSectionActive("hero") && (
            <div className="absolute top-3 left-6 z-40 bg-white text-slate-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("tenantAdmin.landing.canvas.editingHero")}</span>
            </div>
          )}

          <div className="mx-auto max-w-[1420px]">
            {/* Top Eyebrow & Title */}
            <div className="mb-6 text-center text-white">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                {t("tenantAdmin.landing.canvas.heroEyebrow", { brand: brandName })}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                {t("tenantAdmin.landing.canvas.heroHeadline", { brand: brandName })}
              </h1>
            </div>

            {/* Discovery Search Bar */}
            {config.hero.showSearchBar !== false && (
              <div className="career-discovery-search mb-6 grid rounded-2xl border border-white/55 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)] md:grid-cols-[minmax(0,1fr)_300px_auto]">
                <label className="relative flex min-h-16 items-center border-b border-slate-200 px-4 md:border-b-0 md:border-r">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                    <Search className="size-4" />
                  </span>
                  <span className="ml-3 min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      {t("tenantAdmin.landing.canvas.searchKeywordLabel")}
                    </span>
                    <input
                      type="text"
                      readOnly
                      placeholder={t("tenantAdmin.landing.canvas.searchKeywordPlaceholder")}
                      className="mt-0.5 w-full min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400"
                    />
                  </span>
                </label>

                <div className="flex min-h-16 items-center px-5 text-left md:border-r border-slate-200">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    <MapPin className="size-4" />
                  </span>
                  <span className="ml-3 min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      {t("tenantAdmin.landing.canvas.searchLocationLabel")}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800">
                      {t("tenantAdmin.landing.canvas.searchAllLocations")}
                    </span>
                  </span>
                  <ChevronDown className="ml-3 size-4 shrink-0 text-slate-400" />
                </div>

                <div className="pt-1.5 md:pl-1.5 md:pt-0">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 text-sm font-semibold text-white shadow-sm md:h-full transition-all"
                  >
                    <Search className="size-4" />
                    <span>{t("tenantAdmin.landing.canvas.searchButton")}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2-Column: Categories (Left) + Banner Slider Carousel (Right) */}
            <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
              {/* Left Column: Job Categories */}
              <aside className="career-category-card overflow-hidden rounded-2xl border border-white/45 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                <div className="career-category-heading relative overflow-hidden border-b border-[var(--career-border)] px-4 py-3.5">
                  <div className="relative z-10 flex items-center gap-3">
                    {config.header.logoImageUrl ? (
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--career-border)] bg-white p-1.5 shadow-sm">
                        <img src={config.header.logoImageUrl} alt="" className="max-h-full max-w-full object-contain" />
                      </span>
                    ) : (
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white shadow-sm"
                        style={{ backgroundColor: primary }}
                      >
                        {brandName.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-slate-900">
                        {t("tenantAdmin.landing.canvas.categoriesTitle")}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {t("tenantAdmin.landing.canvas.categoriesSubtitle")}
                      </p>
                    </div>
                  </div>
                </div>

                <nav className="space-y-1.5 p-2.5">
                  {[
                    { name: "Software Development / Engineering", count: t("tenantAdmin.landing.canvas.category1Count") },
                    { name: "Data & Artificial Intelligence", count: t("tenantAdmin.landing.canvas.category2Count") },
                    { name: "Product & UI/UX Design", count: t("tenantAdmin.landing.canvas.category3Count") },
                  ].map((dept) => (
                    <div
                      key={dept.name}
                      className="group flex min-h-14 items-center gap-3 rounded-xl border border-transparent px-3 transition-colors hover:border-[var(--career-border)] hover:bg-[var(--color-primary-subtle)]"
                    >
                      <span className="size-2.5 shrink-0 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_4px_var(--color-primary-subtle)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-[var(--color-primary)]">
                          {dept.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{dept.count}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </nav>

                <div className="group flex min-h-14 items-center justify-between border-t border-[var(--career-border)] bg-[var(--color-primary-subtle)] px-5 text-sm font-semibold text-[var(--color-primary)]">
                  <span>{t("tenantAdmin.landing.canvas.viewAllPositions")}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-white shadow-sm">
                    <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </aside>

              {/* Right Column: Hero Banner Slider Carousel */}
              <div className="career-banner-slider relative min-h-[360px] overflow-hidden rounded-2xl border border-white/35 bg-slate-900 shadow-lg group/slider">
                <img
                  src={config.hero.bannerImageUrl || "/acme_tech_hero.png"}
                  alt="Hero Banner"
                  className="absolute inset-0 size-full object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/62 to-slate-900/10"
                  style={{ opacity: (config.hero.overlayOpacity ?? 70) / 100 }}
                />

                {showVisualControls && (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-4 right-4 z-30 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md opacity-0 group-hover/slider:opacity-100 hover:bg-black/80 transition-opacity"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t("tenantAdmin.landing.canvas.changeBannerImage")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => updateHero({ bannerImageUrl: url }))}
                    />
                  </label>
                )}

                {/* Slide content */}
                <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center p-7 text-white sm:p-10 lg:p-12">
                  {/* Eyebrow / Badge */}
                  <div className="mb-3">
                    <span
                      contentEditable={showVisualControls}
                      suppressContentEditableWarning
                      onBlur={(e) => updateHero({ badgeText: e.currentTarget.textContent || "" })}
                      className={`inline-block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400 outline-none transition-all ${
                        showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                      }`}
                      title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBadge") : undefined}
                    >
                      {config.hero.badgeText || t("tenantAdmin.landing.canvas.defaultHeroBadge")}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    contentEditable={showVisualControls}
                    suppressContentEditableWarning
                    onBlur={(e) => updateHero({ title: e.currentTarget.textContent || "" })}
                    className={`text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl outline-none transition-all ${
                      showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                    }`}
                    title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBannerTitle") : undefined}
                  >
                    {config.hero.title || t("tenantAdmin.landing.canvas.defaultHeroTitle", { brand: brandName })}
                  </h2>

                  {/* Subtitle */}
                  <p
                    contentEditable={showVisualControls}
                    suppressContentEditableWarning
                    onBlur={(e) => updateHero({ subtitle: e.currentTarget.textContent || "" })}
                    className={`mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base outline-none transition-all ${
                      showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                    }`}
                    title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBannerSubtitle") : undefined}
                  >
                    {config.hero.subtitle || t("tenantAdmin.landing.canvas.defaultHeroSubtitle")}
                  </p>

                  {/* Action CTA Button */}
                  <div className="mt-6 flex items-center gap-3">
                    <span className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 shadow-md">
                      <span
                        contentEditable={showVisualControls}
                        suppressContentEditableWarning
                        onBlur={(e) => updateHero({ primaryCtaText: e.currentTarget.textContent || "" })}
                        className={`outline-none transition-all ${
                          showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 rounded" : ""
                        }`}
                        title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditButtonText") : undefined}
                      >
                        {config.hero.primaryCtaText || t("tenantAdmin.landing.canvas.defaultPrimaryCta")}
                      </span>
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </div>

                {/* Bottom carousel indicators & control buttons */}
                <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between p-4 sm:p-5">
                  <div className="flex gap-2">
                    <span className="h-1.5 w-8 rounded-full bg-white" />
                    <span className="h-1.5 w-3 rounded-full bg-white/45" />
                    <span className="h-1.5 w-3 rounded-full bg-white/45" />
                  </div>
                  <div className="flex gap-2">
                    <div className="grid size-10 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm">
                      <Pause className="size-4" />
                    </div>
                    <div className="grid size-10 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm">
                      <ChevronLeft className="size-4" />
                    </div>
                    <div className="grid size-10 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm">
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 2: FEATURED JOBS ================= */}
        <section className="career-featured-jobs border-b border-[var(--color-border-default)] py-14 lg:py-20 relative">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="career-featured-heading relative mb-7 overflow-hidden rounded-3xl px-6 py-7 text-white sm:px-8 sm:py-9 lg:flex lg:items-end lg:justify-between lg:gap-10">
              <div className="relative z-10 max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] backdrop-blur-sm">
                  <Sparkles className="size-3.5" />
                  <span>{t("tenantAdmin.landing.canvas.featuredEyebrow")}</span>
                </span>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t("tenantAdmin.landing.canvas.featuredTitle")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                  {t("tenantAdmin.landing.canvas.featuredSubtitle")}
                </p>
              </div>
              <div className="relative z-10 mt-6 flex items-center gap-4 lg:mt-0">
                <div className="hidden text-right sm:block">
                  <strong className="block text-2xl font-semibold">8</strong>
                  <span className="text-xs text-white/70">{t("tenantAdmin.landing.canvas.openPositionsCount")}</span>
                </div>
                <span className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[var(--color-primary)] shadow-lg hover:bg-slate-50">
                  <span>{t("tenantAdmin.landing.canvas.viewAllJobs")}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>

            {/* View Tabs */}
            <div className="mb-5 inline-flex rounded-xl border border-[var(--color-border-default)] bg-white p-1 shadow-sm">
              <span className="min-h-10 rounded-lg px-5 text-sm font-semibold flex items-center bg-[var(--color-primary)] text-white shadow-sm">
                {t("tenantAdmin.landing.canvas.tabAllPositions")}
              </span>
              <span className="min-h-10 rounded-lg px-5 text-sm font-semibold flex items-center text-slate-600">
                {t("tenantAdmin.landing.canvas.tabMatchingYou")}
              </span>
            </div>

            {/* Quick filter row preview */}
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="flex min-h-12 items-center rounded-lg border border-[var(--color-border-default)] bg-white px-4 text-left shadow-sm lg:w-72">
                <SlidersHorizontal className="mr-3 size-4 text-slate-400" />
                <span className="mr-2 text-sm text-slate-500">{t("tenantAdmin.landing.canvas.filterByLabel")}</span>
                <span className="text-sm font-semibold text-slate-800 flex-1">{t("tenantAdmin.landing.canvas.filterLocation")}</span>
                <ChevronDown className="size-4 text-slate-400" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm shadow-sm">
                  <MapPin className="size-4 text-[var(--color-primary)]" />
                  <span className="font-medium text-slate-700">{t("tenantAdmin.landing.canvas.searchAllLocations")}</span>
                  <ChevronDown className="size-4 text-slate-400" />
                </div>
                <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm shadow-sm">
                  <Laptop className="size-4 text-[var(--color-primary)]" />
                  <span className="font-medium text-slate-700">{t("tenantAdmin.landing.canvas.allWorkModes")}</span>
                  <ChevronDown className="size-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Featured Job Cards Preview */}
            <div className="grid auto-rows-fr gap-5 md:grid-cols-2">
              {[
                {
                  title: "Senior Fullstack Engineer (React / Spring Boot)",
                  dept: "Software Development",
                  location: t("tenantAdmin.landing.canvas.sampleJobs.locHanoi"),
                  workMode: t("tenantAdmin.landing.canvas.sampleJobs.modeHybrid"),
                  type: t("tenantAdmin.landing.canvas.sampleJobs.typeFullTime"),
                  salary: t("tenantAdmin.landing.canvas.sampleJobs.salary1"),
                  daysRemaining: 15,
                },
                {
                  title: "AI / Machine Learning Engineer (Python, LLM)",
                  dept: "Data & AI",
                  location: t("tenantAdmin.landing.canvas.sampleJobs.locHcm"),
                  workMode: t("tenantAdmin.landing.canvas.sampleJobs.modeRemote"),
                  type: t("tenantAdmin.landing.canvas.sampleJobs.typeFullTime"),
                  salary: t("tenantAdmin.landing.canvas.sampleJobs.salary2"),
                  daysRemaining: 12,
                },
                {
                  title: "Senior Product Designer (UI/UX, Design System)",
                  dept: "Product Design",
                  location: t("tenantAdmin.landing.canvas.sampleJobs.locDanang"),
                  workMode: t("tenantAdmin.landing.canvas.sampleJobs.modeOnsite"),
                  type: t("tenantAdmin.landing.canvas.sampleJobs.typeFullTime"),
                  salary: t("tenantAdmin.landing.canvas.sampleJobs.salary3"),
                  daysRemaining: 20,
                },
                {
                  title: "DevOps & Cloud Infrastructure Engineer (K8s, AWS)",
                  dept: "Infrastructure",
                  location: t("tenantAdmin.landing.canvas.sampleJobs.locHanoi"),
                  workMode: t("tenantAdmin.landing.canvas.sampleJobs.modeHybrid"),
                  type: t("tenantAdmin.landing.canvas.sampleJobs.typeFullTime"),
                  salary: t("tenantAdmin.landing.canvas.sampleJobs.salary4"),
                  daysRemaining: 18,
                },
              ].map((j, idx) => (
                <article
                  key={idx}
                  className="career-featured-job-card group flex min-w-0 flex-col rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-all hover:border-[var(--color-primary)]/45 hover:shadow-md"
                >
                  <div className="flex min-w-0 gap-4">
                    <span
                      className="grid size-16 shrink-0 place-items-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-xl font-semibold shadow-sm"
                      style={{ color: primary }}
                    >
                      {brandName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          {t("tenantAdmin.landing.canvas.urgentBadge")}
                        </span>
                        <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">
                          {j.title}
                        </h3>
                      </div>
                      <p className="mt-2 truncate text-sm text-slate-500">
                        {brandName} · {j.dept}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-7 flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <MapPin className="size-3.5 text-[var(--color-primary)]" />
                      <span>{j.location}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]">
                      <Laptop className="size-3.5" />
                      <span>{j.workMode}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <Briefcase className="size-3.5" />
                      <span>{j.type}</span>
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-lg font-semibold text-emerald-700">{j.salary}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <Clock className="size-3.5" />
                        <span>{t("tenantAdmin.landing.canvas.daysLeft", { days: j.daysRemaining })}</span>
                      </p>
                    </div>
                    <span className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary-subtle)] px-4 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                      <span>{t("tenantAdmin.landing.canvas.viewDetails")}</span>
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= SECTION 3: CULTURE & ABOUT ================= */}
        {config.about.enabled && (
          <section
            id="about"
            className={`career-section career-section-white border-b border-[var(--color-border-default)] py-16 lg:py-24 relative group transition-all duration-200 ${
              isSectionActive("about")
                ? "ring-2 ring-cyan-500 ring-offset-2 z-20 bg-cyan-50/10 shadow-lg"
                : ""
            }`}
          >
            {showVisualControls && (
              <div className="absolute top-4 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawerTab("about");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow hover:bg-slate-800 transition-transform active:scale-95"
                >
                  <Edit3 className="size-3.5 text-cyan-400" />
                  <span>{t("tenantAdmin.landing.canvas.editAbout")}</span>
                </button>
              </div>
            )}

            {isSectionActive("about") && (
              <div className="absolute top-4 left-6 z-30 bg-cyan-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <Edit3 className="w-2.5 h-2.5" />
                <span>{t("tenantAdmin.landing.canvas.editingAbout")}</span>
              </div>
            )}

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                {/* Culture Media Card (Left) */}
                <div className="career-media-card group/img relative overflow-hidden rounded-3xl border border-slate-200 shadow-lg">
                  {config.about.cultureImageUrl ? (
                    <img
                      src={config.about.cultureImageUrl}
                      alt={t("tenantAdmin.landing.canvas.cultureAlt")}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Building2 className="size-12 opacity-40" />
                    </div>
                  )}

                  {showVisualControls && (
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-4 right-4 z-20 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md opacity-0 group-hover/img:opacity-100 hover:bg-black/80 transition-opacity"
                    >
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t("tenantAdmin.landing.canvas.changeCultureImage")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, (url) => updateAbout({ cultureImageUrl: url }))}
                      />
                    </label>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-8 pointer-events-none">
                    <div className="text-white space-y-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-white/75">
                        {t("tenantAdmin.landing.canvas.workCultureEyebrow")}
                      </span>
                      <h3 className="text-xl font-semibold font-display">
                        {t("tenantAdmin.landing.canvas.workCultureHeadline")}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Culture Content & Stats (Right) */}
                <div className="space-y-6">
                  <div>
                    <span
                      contentEditable={showVisualControls}
                      suppressContentEditableWarning
                      onBlur={(e) => updateAbout({ badge: e.currentTarget.textContent || "" })}
                      className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border inline-block outline-none transition-all ${
                        showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1.5" : ""
                      }`}
                      style={{
                        backgroundColor: `${primary}15`,
                        color: primary,
                        borderColor: `${primary}30`,
                      }}
                      title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBadge") : undefined}
                    >
                      {config.about.badge || t("tenantAdmin.landing.canvas.defaultAboutBadge")}
                    </span>

                    <h2
                      contentEditable={showVisualControls}
                      suppressContentEditableWarning
                      onBlur={(e) => updateAbout({ title: e.currentTarget.textContent || "" })}
                      className={`mb-4 mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl outline-none transition-all ${
                        showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                      }`}
                      title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditSectionTitle") : undefined}
                    >
                      {config.about.title || t("tenantAdmin.landing.canvas.defaultAboutTitle", { brand: brandName })}
                    </h2>

                    <p
                      contentEditable={showVisualControls}
                      suppressContentEditableWarning
                      onBlur={(e) => updateAbout({ description: e.currentTarget.textContent || "" })}
                      className={`whitespace-pre-line text-sm leading-7 text-slate-600 outline-none transition-all ${
                        showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                      }`}
                      title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditDescription") : undefined}
                    >
                      {config.about.description ||
                        t("tenantAdmin.landing.canvas.defaultAboutDescription", { brand: brandName })}
                    </p>
                  </div>

                  {/* Numbers Grid */}
                  <div className="grid gap-4 pt-2 sm:grid-cols-2">
                    {validStats.map((st, i) => (
                      <div
                        key={i}
                        className="career-stat-card rounded-2xl border border-[var(--color-border-default)] p-5 relative group/stat hover:border-cyan-400/60 hover:shadow-md transition-all bg-white"
                      >
                        {/* Quick Action Buttons on hover */}
                        {showVisualControls && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover/stat:opacity-100 transition-opacity flex items-center gap-1 z-10">
                            <button
                              type="button"
                              onClick={() => setEditingIconTarget(editingIconTarget?.type === "stat" && editingIconTarget?.index === i ? null : { type: "stat", index: i })}
                              className="p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-cyan-600 shadow-xs"
                              title={t("tenantAdmin.landing.canvas.changeIconTitle")}
                            >
                              <Sparkles className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = config.about.stats.filter((_, idx) => idx !== i);
                                updateAbout({ stats: next });
                              }}
                              className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-red-600 shadow-xs"
                              title={t("tenantAdmin.landing.canvas.deleteStatTitle")}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        )}

                        {/* Icon Picker Popover */}
                        {editingIconTarget?.type === "stat" && editingIconTarget?.index === i && (
                          <div className="icon-picker-container absolute top-10 right-2 z-50 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xl grid grid-cols-5 gap-1.5 w-48 animate-in fade-in zoom-in-95">
                            {AVAILABLE_ICONS.map((iconName) => (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => {
                                  const next = [...config.about.stats];
                                  next[i] = { ...next[i], icon: iconName };
                                  updateAbout({ stats: next });
                                  setEditingIconTarget(null);
                                }}
                                className={`p-1.5 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors ${
                                  st.icon === iconName ? "bg-cyan-50 text-cyan-600 border border-cyan-200" : "text-slate-600"
                                }`}
                                title={iconName}
                              >
                                {renderIcon(iconName, "size-4")}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (showVisualControls) {
                                setEditingIconTarget(editingIconTarget?.type === "stat" && editingIconTarget?.index === i ? null : { type: "stat", index: i });
                              }
                            }}
                            className={`size-8 rounded-lg flex items-center justify-center transition-transform ${
                              showVisualControls ? "hover:scale-110 cursor-pointer" : ""
                            }`}
                            style={{ backgroundColor: `${primary}15`, color: primary }}
                            title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToChangeIconTitle") : undefined}
                          >
                            {renderIcon(st.icon, "size-4")}
                          </button>

                          <span
                            contentEditable={showVisualControls}
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const next = [...config.about.stats];
                              next[i] = { ...next[i], value: e.currentTarget.textContent || "" };
                              updateAbout({ stats: next });
                            }}
                            className={`text-2xl font-semibold text-slate-900 outline-none transition-all ${
                              showVisualControls
                                ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded"
                                : ""
                            }`}
                            title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditStatValue") : undefined}
                          >
                            {st.value}
                          </span>
                        </div>

                        <span
                          contentEditable={showVisualControls}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const next = [...config.about.stats];
                            next[i] = { ...next[i], label: e.currentTarget.textContent || "" };
                            updateAbout({ stats: next });
                          }}
                          className={`text-xs text-slate-500 block outline-none transition-all ${
                            showVisualControls
                              ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded"
                              : ""
                          }`}
                          title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditStatLabel") : undefined}
                        >
                          {st.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Add Stat Button */}
                  {showVisualControls && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [
                            ...(config.about.stats || []),
                            {
                              icon: "Users",
                              value: "100+",
                              label: t("tenantAdmin.landing.canvas.defaultStatLabel"),
                            },
                          ];
                          updateAbout({ stats: next });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50/40 text-xs font-semibold text-slate-600 hover:text-cyan-700 transition-all shadow-2xs active:scale-95"
                      >
                        <Plus className="size-3.5 text-cyan-600" />
                        <span>{t("tenantAdmin.landing.canvas.addNewStatButton")}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION 4: BENEFITS & PERKS ================= */}
        {config.benefits.enabled && (
          <section
            id="benefits"
            className={`career-benefits-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24 relative group transition-all duration-200 ${
              isSectionActive("benefits")
                ? "ring-2 ring-cyan-500 ring-offset-2 z-20 bg-cyan-50/10 shadow-lg"
                : ""
            }`}
          >
            {showVisualControls && (
              <div className="absolute top-4 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawerTab("benefits");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow hover:bg-slate-800 transition-transform active:scale-95"
                >
                  <Edit3 className="size-3.5 text-cyan-400" />
                  <span>{t("tenantAdmin.landing.canvas.editBenefits")}</span>
                </button>
              </div>
            )}

            {isSectionActive("benefits") && (
              <div className="absolute top-4 left-6 z-30 bg-cyan-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <Edit3 className="w-2.5 h-2.5" />
                <span>{t("tenantAdmin.landing.canvas.editingBenefits")}</span>
              </div>
            )}

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <span
                  contentEditable={showVisualControls}
                  suppressContentEditableWarning
                  onBlur={(e) => updateBenefits({ badge: e.currentTarget.textContent || "" })}
                  className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border inline-block outline-none transition-all ${
                    showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1.5" : ""
                  }`}
                  style={{
                    backgroundColor: `${primary}15`,
                    color: primary,
                    borderColor: `${primary}30`,
                  }}
                  title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBadge") : undefined}
                >
                  {config.benefits.badge || t("tenantAdmin.landing.canvas.defaultBenefitsBadge")}
                </span>

                <h2
                  contentEditable={showVisualControls}
                  suppressContentEditableWarning
                  onBlur={(e) => updateBenefits({ title: e.currentTarget.textContent || "" })}
                  className={`mb-2 mt-3 text-3xl font-semibold tracking-tight text-slate-900 outline-none transition-all ${
                    showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                  }`}
                  title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditTitle") : undefined}
                >
                  {config.benefits.title || t("tenantAdmin.landing.canvas.defaultBenefitsTitle")}
                </h2>

                <p
                  contentEditable={showVisualControls}
                  suppressContentEditableWarning
                  onBlur={(e) => updateBenefits({ subtitle: e.currentTarget.textContent || "" })}
                  className={`text-sm leading-6 text-slate-600 outline-none transition-all ${
                    showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                  }`}
                  title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditDescription") : undefined}
                >
                  {config.benefits.subtitle || t("tenantAdmin.landing.canvas.defaultBenefitsSubtitle")}
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="career-benefits-grid grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {validBenefits.map((b, i) => (
                  <div
                    key={i}
                    className="career-benefit-card group/benefit relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-cyan-400/60"
                  >
                    <span className="absolute right-5 top-4 text-5xl font-semibold text-[var(--color-primary)] opacity-[0.06] select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Quick Action Buttons on hover */}
                    {showVisualControls && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover/benefit:opacity-100 transition-opacity flex items-center gap-1 z-10">
                        <button
                          type="button"
                          onClick={() => setEditingIconTarget(editingIconTarget?.type === "benefit" && editingIconTarget?.index === i ? null : { type: "benefit", index: i })}
                          className="p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-cyan-600 shadow-xs"
                          title={t("tenantAdmin.landing.canvas.changeIconTitle")}
                        >
                          <Sparkles className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = config.benefits.items.filter((_, idx) => idx !== i);
                            updateBenefits({ items: next });
                          }}
                          className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-red-600 shadow-xs"
                          title={t("tenantAdmin.landing.canvas.deleteBenefitTitle")}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    )}

                    {/* Icon Picker Popover */}
                    {editingIconTarget?.type === "benefit" && editingIconTarget?.index === i && (
                      <div className="icon-picker-container absolute top-14 left-4 z-50 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xl grid grid-cols-5 gap-1.5 w-48 animate-in fade-in zoom-in-95">
                        {AVAILABLE_ICONS.map((iconName) => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => {
                              const next = [...config.benefits.items];
                              next[i] = { ...next[i], icon: iconName };
                              updateBenefits({ items: next });
                              setEditingIconTarget(null);
                            }}
                            className={`p-1.5 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors ${
                              b.icon === iconName ? "bg-cyan-50 text-cyan-600 border border-cyan-200" : "text-slate-600"
                            }`}
                            title={iconName}
                          >
                            {renderIcon(iconName, "size-4")}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mb-5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (showVisualControls) {
                            setEditingIconTarget(editingIconTarget?.type === "benefit" && editingIconTarget?.index === i ? null : { type: "benefit", index: i });
                          }
                        }}
                        className={`size-12 rounded-xl flex items-center justify-center transition-transform ${
                          showVisualControls ? "hover:scale-110 cursor-pointer" : ""
                        }`}
                        style={{ backgroundColor: `${primary}15`, color: primary }}
                        title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToChangeIconTitle") : undefined}
                      >
                        {renderIcon(b.icon, "w-6 h-6")}
                      </button>
                    </div>

                    <h3
                      contentEditable={showVisualControls}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const next = [...config.benefits.items];
                        next[i] = { ...next[i], title: e.currentTarget.textContent || "" };
                        updateBenefits({ items: next });
                      }}
                      className={`mb-2 text-base font-semibold text-slate-900 outline-none transition-all ${
                        showVisualControls
                          ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded"
                          : ""
                      }`}
                      title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBenefitTitle") : undefined}
                    >
                      {b.title}
                    </h3>

                    <p
                      contentEditable={showVisualControls}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const next = [...config.benefits.items];
                        next[i] = { ...next[i], description: e.currentTarget.textContent || "" };
                        updateBenefits({ items: next });
                      }}
                      className={`text-sm leading-6 text-slate-600 outline-none transition-all ${
                        showVisualControls
                          ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded"
                          : ""
                      }`}
                      title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBenefitDesc") : undefined}
                    >
                      {b.description}
                    </p>
                  </div>
                ))}

                {/* Add new benefit card */}
                {showVisualControls && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [
                        ...(config.benefits.items || []),
                        {
                          icon: "HeartHandshake",
                          title: t("tenantAdmin.landing.canvas.defaultBenefitTitle"),
                          description: t("tenantAdmin.landing.canvas.defaultBenefitDesc"),
                        },
                      ];
                      updateBenefits({ items: next });
                    }}
                    className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50/30 p-6 text-slate-500 hover:text-cyan-700 transition-all cursor-pointer group/add active:scale-98"
                  >
                    <div className="size-10 rounded-xl bg-slate-100 group-hover/add:bg-cyan-100 flex items-center justify-center mb-2 transition-colors">
                      <Plus className="size-5 text-slate-600 group-hover/add:text-cyan-600" />
                    </div>
                    <span className="text-sm font-semibold">{t("tenantAdmin.landing.canvas.addBenefitCardButton")}</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================= SECTION 5: HIRING PROCESS ================= */}
        <section id="hiring-process" className="career-process-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                {t("tenantAdmin.landing.canvas.processEyebrow")}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {t("tenantAdmin.landing.canvas.processTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t("tenantAdmin.landing.canvas.processSubtitle")}
              </p>
            </div>

            <ol className="career-process grid gap-4 md:grid-cols-5">
              {[
                { title: t("tenantAdmin.landing.canvas.processSteps.s1Title"), text: t("tenantAdmin.landing.canvas.processSteps.s1Text") },
                { title: t("tenantAdmin.landing.canvas.processSteps.s2Title"), text: t("tenantAdmin.landing.canvas.processSteps.s2Text") },
                { title: t("tenantAdmin.landing.canvas.processSteps.s3Title"), text: t("tenantAdmin.landing.canvas.processSteps.s3Text") },
                { title: t("tenantAdmin.landing.canvas.processSteps.s4Title"), text: t("tenantAdmin.landing.canvas.processSteps.s4Text") },
                { title: t("tenantAdmin.landing.canvas.processSteps.s5Title"), text: t("tenantAdmin.landing.canvas.processSteps.s5Text") },
              ].map((step, index) => (
                <li
                  key={index}
                  className="career-process-step group relative rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white shadow-[0_0_0_6px_var(--color-primary-subtle)] transition-transform group-hover:scale-110">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================= SECTION 6: TESTIMONIALS ================= */}
        {config.testimonials.enabled && (
          <section
            id="stories"
            className={`career-stories-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24 relative group transition-all duration-200 ${
              isSectionActive("testimonials")
                ? "ring-2 ring-cyan-500 ring-offset-2 z-20 bg-cyan-50/10 shadow-lg"
                : ""
            }`}
          >
            {showVisualControls && (
              <div className="absolute top-4 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawerTab("testimonials");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow hover:bg-slate-800 transition-transform active:scale-95"
                >
                  <Edit3 className="size-3.5 text-cyan-400" />
                  <span>{t("tenantAdmin.landing.canvas.editTestimonials")}</span>
                </button>
              </div>
            )}

            {isSectionActive("testimonials") && (
              <div className="absolute top-4 left-6 z-30 bg-cyan-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <Edit3 className="w-2.5 h-2.5" />
                <span>{t("tenantAdmin.landing.canvas.editingTestimonials")}</span>
              </div>
            )}

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <span
                  contentEditable={showVisualControls}
                  suppressContentEditableWarning
                  onBlur={(e) => updateTestimonials({ badge: e.currentTarget.textContent || "" })}
                  className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border inline-block outline-none transition-all ${
                    showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1.5" : ""
                  }`}
                  style={{
                    backgroundColor: `${primary}15`,
                    color: primary,
                    borderColor: `${primary}30`,
                  }}
                  title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditBadge") : undefined}
                >
                  {config.testimonials.badge || t("tenantAdmin.landing.canvas.defaultTestimonialsBadge")}
                </span>

                <h2
                  contentEditable={showVisualControls}
                  suppressContentEditableWarning
                  onBlur={(e) => updateTestimonials({ title: e.currentTarget.textContent || "" })}
                  className={`mt-3 text-3xl font-semibold tracking-tight text-slate-900 outline-none transition-all ${
                    showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                  }`}
                  title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditTitle") : undefined}
                >
                  {config.testimonials.title || t("tenantAdmin.landing.canvas.defaultTestimonialsTitle")}
                </h2>
              </div>

              <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
                {validTestimonials.map((item, i) => (
                  <div
                    key={i}
                    className="career-story-card group/story relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-cyan-400/60"
                  >
                    {showVisualControls && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = config.testimonials.items.filter((_, idx) => idx !== i);
                          updateTestimonials({ items: next });
                        }}
                        className="absolute top-4 right-4 opacity-0 group-hover/story:opacity-100 transition-opacity p-1 rounded-md text-slate-400 hover:text-red-600 bg-white border border-slate-200 shadow-xs"
                        title={t("tenantAdmin.landing.canvas.deleteTestimonialTitle")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}

                    <Quote className="mb-5 size-9 text-[var(--color-primary)] opacity-25" />

                    <blockquote
                      contentEditable={showVisualControls}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const next = [...config.testimonials.items];
                        next[i] = { ...next[i], quote: e.currentTarget.textContent || "" };
                        updateTestimonials({ items: next });
                      }}
                      className={`mb-7 flex-1 text-base italic leading-7 text-slate-700 outline-none transition-all ${
                        showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                      }`}
                      title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditQuote") : undefined}
                    >
                      “{item.quote}”
                    </blockquote>

                    <div className="flex items-center gap-3">
                      <div
                        className="size-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                        style={{ backgroundColor: primary }}
                      >
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.name} className="size-full rounded-full object-cover" />
                        ) : (
                          item.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          contentEditable={showVisualControls}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const next = [...config.testimonials.items];
                            next[i] = { ...next[i], name: e.currentTarget.textContent || "" };
                            updateTestimonials({ items: next });
                          }}
                          className={`text-sm font-semibold text-slate-900 outline-none transition-all ${
                            showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                          }`}
                          title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditName") : undefined}
                        >
                          {item.name}
                        </div>
                        <div
                          contentEditable={showVisualControls}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const next = [...config.testimonials.items];
                            next[i] = { ...next[i], role: e.currentTarget.textContent || "" };
                            updateTestimonials({ items: next });
                          }}
                          className={`text-xs text-slate-500 outline-none transition-all ${
                            showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                          }`}
                          title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditRole") : undefined}
                        >
                          {item.role}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {showVisualControls && (
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [
                        ...(config.testimonials.items || []),
                        {
                          name: t("tenantAdmin.landing.canvas.defaultTestimonialName"),
                          role: t("tenantAdmin.landing.canvas.defaultTestimonialRole"),
                          avatarUrl: "",
                          quote: t("tenantAdmin.landing.canvas.defaultTestimonialQuote"),
                        },
                      ];
                      updateTestimonials({ items: next });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50/30 text-xs font-semibold text-slate-700 hover:text-cyan-700 transition-all shadow-2xs"
                  >
                    <Plus className="size-3.5 text-cyan-600" />
                    <span>{t("tenantAdmin.landing.canvas.addTestimonialButton")}</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= SECTION 7: FAQ ================= */}
        <section id="faq" className="career-faq-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div className="career-faq-intro h-fit rounded-3xl p-7 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm">
                <FileText className="size-5" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                {t("tenantAdmin.landing.canvas.faqEyebrow")}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {t("tenantAdmin.landing.canvas.faqTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t("tenantAdmin.landing.canvas.faqSubtitle")}
              </p>
            </div>

            <div className="space-y-3">
              {[
                [t("tenantAdmin.landing.canvas.faqItems.q1"), t("tenantAdmin.landing.canvas.faqItems.a1")],
                [t("tenantAdmin.landing.canvas.faqItems.q2"), t("tenantAdmin.landing.canvas.faqItems.a2")],
                [t("tenantAdmin.landing.canvas.faqItems.q3"), t("tenantAdmin.landing.canvas.faqItems.a3")],
                [t("tenantAdmin.landing.canvas.faqItems.q4"), t("tenantAdmin.landing.canvas.faqItems.a4")],
              ].map(([question, answer], index) => (
                <div
                  key={index}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                    openFaq === index ? "border-[var(--color-primary)]/40 shadow-md" : "border-[var(--color-border-default)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFaq(openFaq === index ? null : index);
                    }}
                    className="flex min-h-16 w-full items-center justify-between gap-4 px-5 text-left text-sm font-semibold hover:bg-[var(--color-primary-subtle)]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-[var(--color-primary)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{question}</span>
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100">
                      <ChevronDown className={`size-4 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {openFaq === index && (
                    <p className="border-t border-[var(--color-border-default)] px-5 py-5 text-sm leading-6 text-slate-600">
                      {answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= SECTION 8: FINAL CTA ================= */}
        <section className="career-section career-section-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="career-final-cta mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] p-8 text-white shadow-xl sm:p-10 lg:flex-row lg:items-center lg:p-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                {t("tenantAdmin.landing.canvas.finalCtaEyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {t("tenantAdmin.landing.canvas.finalCtaTitle", { brand: brandName })}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                {t("tenantAdmin.landing.canvas.finalCtaDesc")}
              </p>
            </div>
            <span className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[var(--color-primary)] hover:bg-slate-50 shadow-sm">
              <span>{t("tenantAdmin.landing.canvas.viewAllJobs")}</span>
              <ArrowRight className="size-4" />
            </span>
          </div>
        </section>

        {/* ================= SECTION 9: FOOTER ================= */}
        <footer
          className={`career-footer relative overflow-hidden border-t border-white/10 pb-8 pt-16 text-sm group transition-all duration-200 ${
            isSectionActive("footer")
              ? "ring-2 ring-cyan-500 ring-offset-2 z-20 shadow-2xl"
              : ""
          }`}
        >
          {showVisualControls && (
            <div className="absolute top-4 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawerTab("footer");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-white text-xs font-semibold shadow hover:bg-slate-700 border border-slate-700 transition-transform active:scale-95"
              >
                <Edit3 className="size-3.5 text-cyan-400" />
                <span>{t("tenantAdmin.landing.canvas.editFooter")}</span>
              </button>
            </div>
          )}

          {isSectionActive("footer") && (
            <div className="absolute top-4 left-6 z-30 bg-cyan-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <Edit3 className="w-2.5 h-2.5" />
              <span>{t("tenantAdmin.landing.canvas.editingFooter")}</span>
            </div>
          )}

          <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_0.8fr]">
              {/* Col 1: Brand Info */}
              <div className="max-w-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: primary }}
                  >
                    {brandName.charAt(0)}
                  </div>
                  <span className="text-base font-semibold tracking-tight text-white">{brandName}</span>
                </div>
                <p
                  contentEditable={showVisualControls}
                  suppressContentEditableWarning
                  onBlur={(e) => updateFooter({ description: e.currentTarget.textContent || "" })}
                  className={`text-sm leading-6 text-white/65 outline-none transition-all ${
                    showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                  }`}
                  title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditFooterDesc") : undefined}
                >
                  {config.footer.description || t("tenantAdmin.landing.canvas.defaultFooterDesc")}
                </p>
              </div>

              {/* Col 2: Navigation Links */}
              <div>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  {t("tenantAdmin.landing.canvas.footerExploreTitle")}
                </h2>
                <ul className="space-y-3 text-white/65">
                  <li className="hover:text-white">{t("tenantAdmin.landing.canvas.footerExploreJobs")}</li>
                  <li className="hover:text-white">{t("tenantAdmin.landing.canvas.footerExploreAbout")}</li>
                  <li className="hover:text-white">{t("tenantAdmin.landing.canvas.footerExploreProcess")}</li>
                  <li className="hover:text-white">{t("tenantAdmin.landing.canvas.footerExploreFaq")}</li>
                </ul>
              </div>

              {/* Col 3: Contact Details */}
              <div className="space-y-3 text-white/65">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  {config.footer.contactTitle || t("tenantAdmin.landing.canvas.defaultFooterContactTitle")}
                </h2>

                <div className="flex items-start gap-2.5">
                  <Building className="mt-0.5 size-4 shrink-0 text-white/45" />
                  <span
                    contentEditable={showVisualControls}
                    suppressContentEditableWarning
                    onBlur={(e) => updateFooter({ address: e.currentTarget.textContent || "" })}
                    className={`outline-none transition-all ${
                      showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                    }`}
                    title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditAddress") : undefined}
                  >
                    {config.footer.address || t("tenantAdmin.landing.canvas.defaultFooterAddress")}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-white/45" />
                  <span
                    contentEditable={showVisualControls}
                    suppressContentEditableWarning
                    onBlur={(e) => updateFooter({ contactEmail: e.currentTarget.textContent || "" })}
                    className={`outline-none transition-all ${
                      showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                    }`}
                    title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditEmail") : undefined}
                  >
                    {config.footer.contactEmail || `careers@${brandName.toLowerCase()}.com`}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-white/45" />
                  <span
                    contentEditable={showVisualControls}
                    suppressContentEditableWarning
                    onBlur={(e) => updateFooter({ contactPhone: e.currentTarget.textContent || "" })}
                    className={`outline-none transition-all ${
                      showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                    }`}
                    title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditPhone") : undefined}
                  >
                    {config.footer.contactPhone || "+84 (0) 24 3999 8888"}
                  </span>
                </div>
              </div>

              {/* Col 4: Social Links */}
              <div className="space-y-3">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  {config.footer.socialTitle || t("tenantAdmin.landing.canvas.defaultFooterSocialTitle")}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-white/65">
                  <div className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white transition-colors">
                    <Linkedin className="size-4" />
                  </div>
                  <div className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white transition-colors">
                    <Facebook className="size-4" />
                  </div>
                  <div className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white transition-colors">
                    <Github className="size-4" />
                  </div>
                  <div className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white transition-colors">
                    <Globe className="size-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Copyright bar */}
            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
              <p
                contentEditable={showVisualControls}
                suppressContentEditableWarning
                onBlur={(e) => updateFooter({ copyrightText: e.currentTarget.textContent || "" })}
                className={`outline-none transition-all ${
                  showVisualControls ? "hover:ring-2 hover:ring-cyan-400/50 focus:ring-2 focus:ring-cyan-400 cursor-text px-1 -mx-1 rounded" : ""
                }`}
                title={showVisualControls ? t("tenantAdmin.landing.canvas.clickToEditCopyright") : undefined}
              >
                {config.footer.copyrightText ||
                  t("tenantAdmin.landing.canvas.defaultFooterCopyright", { brand: brandName })}
              </p>
              <p>
                {config.footer.bottomText || t("tenantAdmin.landing.canvas.defaultFooterBottomText")}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
