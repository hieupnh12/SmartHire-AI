import React, { useMemo } from "react";
import {
  X,
  SlidersHorizontal,
  Palette,
  LayoutTemplate,
  Building2,
  Gift,
  Code2,
  MessageSquareQuote,
  Globe2,
  Search,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import type { LandingPageConfig } from "../types/landing";
import {
  getColorPresets,
  getFontOptions,
  getBorderRadiusOptions,
  getBannerHeightOptions,
  inputClass,
  labelClass,
} from "../utils/constants";

interface LandingEditorDrawerProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (val: string) => void;
  config: LandingPageConfig;
  updateHeader: (patch: Partial<LandingPageConfig["header"]>) => void;
  updateTheme: (patch: Partial<LandingPageConfig["theme"]>) => void;
  updateHero: (patch: Partial<LandingPageConfig["hero"]>) => void;
  updateAbout: (patch: Partial<LandingPageConfig["about"]>) => void;
  updateBenefits: (patch: Partial<LandingPageConfig["benefits"]>) => void;
  updateTechStack: (patch: Partial<LandingPageConfig["techStack"]>) => void;
  updateTestimonials: (patch: Partial<LandingPageConfig["testimonials"]>) => void;
  updateFooter: (patch: Partial<LandingPageConfig["footer"]>) => void;
  updateSeo: (patch: Partial<LandingPageConfig["seo"]>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void) => void;
  isUploading: boolean;
  newTagInput: string;
  setNewTagInput: (val: string) => void;
}

export function LandingEditorDrawer(props: LandingEditorDrawerProps) {
  const t = useT();
  const {
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab,
    config,
    updateHeader,
    updateTheme,
    updateHero,
    updateAbout,
    updateBenefits,
    updateTechStack,
    updateTestimonials,
    updateFooter,
    updateSeo,
    handleFileUpload,
    isUploading,
    newTagInput,
    setNewTagInput,
  } = props;

  const colorPresets = useMemo(() => getColorPresets(t), [t]);
  const fontOptions = useMemo(() => getFontOptions(t), [t]);
  const borderRadiusOptions = useMemo(() => getBorderRadiusOptions(t), [t]);
  const bannerHeightOptions = useMemo(() => getBannerHeightOptions(t), [t]);

  const tabs = useMemo(
    () => [
      { id: "header", label: t("tenantAdmin.landing.drawer.tabs.header"), icon: SlidersHorizontal },
      { id: "theme", label: t("tenantAdmin.landing.drawer.tabs.theme"), icon: Palette },
      { id: "hero", label: t("tenantAdmin.landing.drawer.tabs.hero"), icon: LayoutTemplate },
      { id: "about", label: t("tenantAdmin.landing.drawer.tabs.about"), icon: Building2 },
      { id: "benefits", label: t("tenantAdmin.landing.drawer.tabs.benefits"), icon: Gift },
      { id: "techStack", label: t("tenantAdmin.landing.drawer.tabs.techStack"), icon: Code2 },
      { id: "testimonials", label: t("tenantAdmin.landing.drawer.tabs.testimonials"), icon: MessageSquareQuote },
      { id: "footer", label: t("tenantAdmin.landing.drawer.tabs.footer"), icon: Globe2 },
      { id: "seo", label: t("tenantAdmin.landing.drawer.tabs.seo"), icon: Search },
    ],
    [t],
  );

  return (
    <aside
      className={`absolute lg:relative z-40 inset-y-0 left-0 bg-white text-slate-900 border-r border-slate-200 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
        isDrawerOpen ? "w-[420px] max-w-[90vw] translate-x-0" : "-translate-x-full lg:w-0 lg:translate-x-0 overflow-hidden border-none"
      }`}
    >
      {isDrawerOpen && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-bold text-slate-900">{t("tenantAdmin.landing.drawer.title")}</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title={t("tenantAdmin.landing.drawer.closeTitle")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector Pills */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-slate-50/50 [scrollbar-width:none]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive ? "bg-brand-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-800">
            {/* TAB: HEADER */}
            {activeTab === "header" && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {t("tenantAdmin.landing.drawer.header.logoLabel")}
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-primary text-white text-[11px] font-semibold hover:opacity-95">
                      <Upload className="w-3 h-3" />
                      <span>
                        {isUploading
                          ? t("tenantAdmin.landing.drawer.header.uploading")
                          : t("tenantAdmin.landing.drawer.header.uploadImage")}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleFileUpload(e, (url) => updateHeader({ logoImageUrl: url }))}
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={config.header?.logoImageUrl || ""}
                    onChange={(e) => updateHeader({ logoImageUrl: e.target.value })}
                    placeholder={t("tenantAdmin.landing.drawer.header.logoPlaceholder")}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-400">
                    {t("tenantAdmin.landing.drawer.header.logoHint")}
                  </p>
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.header.sloganLabel")}</label>
                  <input
                    type="text"
                    value={config.header?.slogan || ""}
                    onChange={(e) => updateHeader({ slogan: e.target.value })}
                    placeholder={t("tenantAdmin.landing.drawer.header.sloganPlaceholder")}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* TAB: THEME */}
            {activeTab === "theme" && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.theme.brandPaletteLabel")}</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {colorPresets.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => updateTheme({ primaryColor: p.hex, primaryHover: p.hover })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold ${
                          config.theme.primaryColor.toLowerCase() === p.hex.toLowerCase()
                            ? "border-slate-800 ring-2 ring-slate-800/10 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.hex }} />
                        <span>{p.shortName}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 mb-1 block">
                        {t("tenantAdmin.landing.drawer.theme.primaryHexLabel")}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.theme.primaryColor}
                          onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                          className="w-8 h-8 p-1 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.theme.primaryColor}
                          onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 mb-1 block">
                        {t("tenantAdmin.landing.drawer.theme.secondaryHexLabel")}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.theme.secondaryColor || "#505f76"}
                          onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                          className="w-8 h-8 p-1 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.theme.secondaryColor || "#505f76"}
                          onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.theme.fontFamilyLabel")}</label>
                  <select
                    value={config.theme.fontFamily}
                    onChange={(e) => updateTheme({ fontFamily: e.target.value })}
                    className={inputClass}
                  >
                    {fontOptions.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.theme.borderRadiusLabel")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {borderRadiusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateTheme({ borderRadius: opt.value })}
                        className={`p-2 rounded border text-xs font-semibold text-center ${
                          config.theme.borderRadius === opt.value
                            ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HERO */}
            {activeTab === "hero" && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.hero.badgeLabel")}</label>
                  <input
                    type="text"
                    value={config.hero.badgeText}
                    onChange={(e) => updateHero({ badgeText: e.target.value })}
                    placeholder={t("tenantAdmin.landing.drawer.hero.badgePlaceholder")}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.hero.titleLabel")}</label>
                  <input
                    type="text"
                    value={config.hero.title}
                    onChange={(e) => updateHero({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.hero.highlightLabel")}</label>
                  <input
                    type="text"
                    value={config.hero.highlightWords}
                    onChange={(e) => updateHero({ highlightWords: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.hero.subtitleLabel")}</label>
                  <textarea
                    rows={3}
                    value={config.hero.subtitle}
                    onChange={(e) => updateHero({ subtitle: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {t("tenantAdmin.landing.drawer.hero.bannerImageLabel")}
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-primary text-white text-[11px] font-semibold hover:opacity-95">
                      <Upload className="w-3 h-3" />
                      <span>
                        {isUploading
                          ? t("tenantAdmin.landing.drawer.hero.uploading")
                          : t("tenantAdmin.landing.drawer.hero.uploadImage")}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleFileUpload(e, (url) => updateHero({ bannerImageUrl: url }))}
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={config.hero.bannerImageUrl}
                    onChange={(e) => updateHero({ bannerImageUrl: e.target.value })}
                    placeholder={t("tenantAdmin.landing.drawer.hero.bannerPlaceholder")}
                    className={inputClass}
                  />

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className={labelClass}>{t("tenantAdmin.landing.drawer.hero.bannerHeightLabel")}</label>
                      <select
                        value={config.hero.bannerHeight || "540px"}
                        onChange={(e) => updateHero({ bannerHeight: e.target.value })}
                        className={inputClass}
                      >
                        {bannerHeightOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>
                        {t("tenantAdmin.landing.drawer.hero.overlayOpacityLabel", {
                          opacity: config.hero.overlayOpacity ?? 70,
                        })}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        step={5}
                        value={config.hero.overlayOpacity ?? 70}
                        onChange={(e) => updateHero({ overlayOpacity: Number(e.target.value) })}
                        className="w-full mt-2 accent-brand-primary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.hero.primaryCtaLabel")}</label>
                    <input
                      type="text"
                      value={config.hero.primaryCtaText}
                      onChange={(e) => updateHero({ primaryCtaText: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.hero.secondaryCtaLabel")}</label>
                    <input
                      type="text"
                      value={config.hero.secondaryCtaText}
                      onChange={(e) => updateHero({ secondaryCtaText: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={config.hero.showSearchBar}
                      onChange={(e) => updateHero({ showSearchBar: e.target.checked })}
                      className="rounded text-brand-primary focus:ring-brand-primary"
                    />
                    <span>{t("tenantAdmin.landing.drawer.hero.showSearchBarLabel")}</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB: ABOUT */}
            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">{t("tenantAdmin.landing.drawer.about.enableLabel")}</label>
                  <input
                    type="checkbox"
                    checked={config.about.enabled}
                    onChange={(e) => updateAbout({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.about.titleLabel")}</label>
                  <input
                    type="text"
                    value={config.about.title}
                    onChange={(e) => updateAbout({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.about.descriptionLabel")}</label>
                  <textarea
                    rows={4}
                    value={config.about.description}
                    onChange={(e) => updateAbout({ description: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {t("tenantAdmin.landing.drawer.about.imageLabel")}
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-primary text-white text-[11px] font-semibold">
                      <Upload className="w-3 h-3" />
                      <span>{t("tenantAdmin.landing.drawer.about.uploadImage")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, (url) => updateAbout({ cultureImageUrl: url }))}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.about.cultureImageUrl}
                    onChange={(e) => updateAbout({ cultureImageUrl: e.target.value })}
                    placeholder={t("tenantAdmin.landing.drawer.about.imagePlaceholder")}
                    className={inputClass}
                  />
                </div>

                {/* Stats List */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {t("tenantAdmin.landing.drawer.about.statsHeading", {
                        count: config.about.stats?.length || 0,
                      })}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [
                          ...(config.about.stats || []),
                          {
                            icon: "Users",
                            value: "100+",
                            label: t("tenantAdmin.landing.drawer.about.defaultStatLabel"),
                          },
                        ];
                        updateAbout({ stats: next });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t("tenantAdmin.landing.drawer.about.addStat")}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(config.about.stats || []).map((st, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {t("tenantAdmin.landing.drawer.about.statItemTitle", { index: idx + 1 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = config.about.stats.filter((_, i) => i !== idx);
                              updateAbout({ stats: next });
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title={t("tenantAdmin.landing.drawer.about.deleteStatTitle")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">
                              {t("tenantAdmin.landing.drawer.about.iconLabel")}
                            </label>
                            <select
                              value={st.icon}
                              onChange={(e) => {
                                const next = [...config.about.stats];
                                next[idx] = { ...next[idx], icon: e.target.value };
                                updateAbout({ stats: next });
                              }}
                              className={inputClass}
                            >
                              {["Users", "Award", "Globe", "Zap", "Briefcase", "HeartHandshake", "Laptop", "TrendingUp", "Coffee", "ShieldCheck", "CheckCircle2", "Code", "Layers", "Cpu", "Sparkles"].map((ic) => (
                                <option key={ic} value={ic}>
                                  {ic}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">
                              {t("tenantAdmin.landing.drawer.about.valueLabel")}
                            </label>
                            <input
                              type="text"
                              value={st.value}
                              onChange={(e) => {
                                const next = [...config.about.stats];
                                next[idx] = { ...next[idx], value: e.target.value };
                                updateAbout({ stats: next });
                              }}
                              placeholder="500+"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">
                              {t("tenantAdmin.landing.drawer.about.labelField")}
                            </label>
                            <input
                              type="text"
                              value={st.label}
                              onChange={(e) => {
                                const next = [...config.about.stats];
                                next[idx] = { ...next[idx], label: e.target.value };
                                updateAbout({ stats: next });
                              }}
                              placeholder={t("tenantAdmin.landing.drawer.about.labelPlaceholder")}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BENEFITS */}
            {activeTab === "benefits" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">{t("tenantAdmin.landing.drawer.benefits.enableLabel")}</label>
                  <input
                    type="checkbox"
                    checked={config.benefits.enabled}
                    onChange={(e) => updateBenefits({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.benefits.titleLabel")}</label>
                  <input
                    type="text"
                    value={config.benefits.title}
                    onChange={(e) => updateBenefits({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.benefits.subtitleLabel")}</label>
                  <input
                    type="text"
                    value={config.benefits.subtitle}
                    onChange={(e) => updateBenefits({ subtitle: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* Benefits List */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {t("tenantAdmin.landing.drawer.benefits.itemsHeading", {
                        count: config.benefits.items?.length || 0,
                      })}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [
                          ...(config.benefits.items || []),
                          {
                            icon: "HeartHandshake",
                            title: t("tenantAdmin.landing.drawer.benefits.defaultItemTitle"),
                            description: t("tenantAdmin.landing.drawer.benefits.defaultItemDesc"),
                          },
                        ];
                        updateBenefits({ items: next });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t("tenantAdmin.landing.drawer.benefits.addItem")}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(config.benefits.items || []).map((b, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {t("tenantAdmin.landing.drawer.benefits.itemTitle", { index: idx + 1 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = config.benefits.items.filter((_, i) => i !== idx);
                              updateBenefits({ items: next });
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title={t("tenantAdmin.landing.drawer.benefits.deleteItemTitle")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">
                              {t("tenantAdmin.landing.drawer.benefits.iconLabel")}
                            </label>
                            <select
                              value={b.icon}
                              onChange={(e) => {
                                const next = [...config.benefits.items];
                                next[idx] = { ...next[idx], icon: e.target.value };
                                updateBenefits({ items: next });
                              }}
                              className={inputClass}
                            >
                              {["Users", "Award", "Globe", "Zap", "Briefcase", "HeartHandshake", "Laptop", "TrendingUp", "Coffee", "ShieldCheck", "CheckCircle2", "Code", "Layers", "Cpu", "Sparkles"].map((ic) => (
                                <option key={ic} value={ic}>
                                  {ic}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-500 block mb-0.5">
                              {t("tenantAdmin.landing.drawer.benefits.cardTitleLabel")}
                            </label>
                            <input
                              type="text"
                              value={b.title}
                              onChange={(e) => {
                                const next = [...config.benefits.items];
                                next[idx] = { ...next[idx], title: e.target.value };
                                updateBenefits({ items: next });
                              }}
                              placeholder={t("tenantAdmin.landing.drawer.benefits.cardTitlePlaceholder")}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">
                            {t("tenantAdmin.landing.drawer.benefits.cardDescLabel")}
                          </label>
                          <textarea
                            rows={2}
                            value={b.description}
                            onChange={(e) => {
                              const next = [...config.benefits.items];
                              next[idx] = { ...next[idx], description: e.target.value };
                              updateBenefits({ items: next });
                            }}
                            placeholder={t("tenantAdmin.landing.drawer.benefits.cardDescPlaceholder")}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TECH STACK */}
            {activeTab === "techStack" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">{t("tenantAdmin.landing.drawer.techStack.enableLabel")}</label>
                  <input
                    type="checkbox"
                    checked={config.techStack.enabled}
                    onChange={(e) => updateTechStack({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.techStack.titleLabel")}</label>
                  <input
                    type="text"
                    value={config.techStack.title}
                    onChange={(e) => updateTechStack({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.techStack.subtitleLabel")}</label>
                  <input
                    type="text"
                    value={config.techStack.subtitle}
                    onChange={(e) => updateTechStack({ subtitle: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.techStack.addTagLabel")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTagInput.trim()) {
                          e.preventDefault();
                          const tag = newTagInput.trim();
                          if (!config.techStack.tags.includes(tag)) {
                            updateTechStack({ tags: [...config.techStack.tags, tag] });
                          }
                          setNewTagInput("");
                        }
                      }}
                      placeholder={t("tenantAdmin.landing.drawer.techStack.addTagPlaceholder")}
                      className={inputClass}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (newTagInput.trim()) {
                          const tag = newTagInput.trim();
                          if (!config.techStack.tags.includes(tag)) {
                            updateTechStack({ tags: [...config.techStack.tags, tag] });
                          }
                          setNewTagInput("");
                        }
                      }}
                    >
                      {t("tenantAdmin.landing.drawer.techStack.addTagButton")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TESTIMONIALS */}
            {activeTab === "testimonials" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">{t("tenantAdmin.landing.drawer.testimonials.enableLabel")}</label>
                  <input
                    type="checkbox"
                    checked={config.testimonials.enabled}
                    onChange={(e) => updateTestimonials({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.testimonials.titleLabel")}</label>
                  <input
                    type="text"
                    value={config.testimonials.title}
                    onChange={(e) => updateTestimonials({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* TAB: FOOTER */}
            {activeTab === "footer" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.contactTitleLabel")}</label>
                    <input
                      type="text"
                      value={config.footer.contactTitle || ""}
                      onChange={(e) => updateFooter({ contactTitle: e.target.value })}
                      placeholder={t("tenantAdmin.landing.drawer.footer.contactTitlePlaceholder")}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.socialTitleLabel")}</label>
                    <input
                      type="text"
                      value={config.footer.socialTitle || ""}
                      onChange={(e) => updateFooter({ socialTitle: e.target.value })}
                      placeholder={t("tenantAdmin.landing.drawer.footer.socialTitlePlaceholder")}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.emailLabel")}</label>
                    <input
                      type="email"
                      value={config.footer.contactEmail || ""}
                      onChange={(e) => updateFooter({ contactEmail: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.hotlineLabel")}</label>
                    <input
                      type="text"
                      value={config.footer.contactPhone || ""}
                      onChange={(e) => updateFooter({ contactPhone: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.addressLabel")}</label>
                  <input
                    type="text"
                    value={config.footer.address || ""}
                    onChange={(e) => updateFooter({ address: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.linkedinLabel")}</label>
                    <input
                      type="url"
                      value={config.footer.linkedinUrl || ""}
                      onChange={(e) => updateFooter({ linkedinUrl: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.facebookLabel")}</label>
                    <input
                      type="url"
                      value={config.footer.facebookUrl || ""}
                      onChange={(e) => updateFooter({ facebookUrl: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.copyrightLabel")}</label>
                  <input
                    type="text"
                    value={config.footer.copyrightText || ""}
                    onChange={(e) => updateFooter({ copyrightText: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.bottomTextLabel")}</label>
                  <input
                    type="text"
                    value={config.footer.bottomText || ""}
                    onChange={(e) => updateFooter({ bottomText: e.target.value })}
                    placeholder={t("tenantAdmin.landing.drawer.footer.bottomTextPlaceholder")}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.footer.descriptionLabel")}</label>
                  <textarea
                    rows={2}
                    value={config.footer.description || ""}
                    onChange={(e) => updateFooter({ description: e.target.value })}
                    placeholder={t("tenantAdmin.landing.drawer.footer.descriptionPlaceholder")}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* TAB: SEO */}
            {activeTab === "seo" && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.seo.metaTitleLabel")}</label>
                  <input
                    type="text"
                    value={config.seo.metaTitle}
                    onChange={(e) => updateSeo({ metaTitle: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.seo.metaDescLabel")}</label>
                  <textarea
                    rows={3}
                    value={config.seo.metaDescription}
                    onChange={(e) => updateSeo({ metaDescription: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("tenantAdmin.landing.drawer.seo.ogImageLabel")}</label>
                  <input
                    type="text"
                    value={config.seo.ogImageUrl || ""}
                    onChange={(e) => updateSeo({ ogImageUrl: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
