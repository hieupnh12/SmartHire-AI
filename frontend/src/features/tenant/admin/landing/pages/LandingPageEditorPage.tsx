import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { landingApi } from "@/api/tenant/landingApi";
import type { LandingPageConfig } from "../types/landing";
import { Button } from "@/components/ux/Button";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { useT } from "@/i18n";
import { toast } from "@/stores/toastStore";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import {
  Menu,
  ArrowLeft,
  RotateCcw,
  Save,
  Send,
  ExternalLink,
  Smartphone,
  Monitor,
  MonitorSmartphone,
  Tablet,
  Maximize,
  Check,
  Wand2,
} from "lucide-react";
import { LandingEditorDrawer } from "../components/LandingEditorDrawer";
import { LandingEditorCanvas } from "../components/LandingEditorCanvas";

export function LandingPageEditorPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rawTenantCode = getTenantIdFromWindow() || "acme";

  // UI Builder States
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showVisualControls, setShowVisualControls] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("hero");
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isViewModeMenuOpen, setIsViewModeMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [inlineNewTag, setInlineNewTag] = useState<string>("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tenant-landing-page"],
    queryFn: landingApi.getAdminLandingPage,
    // Keep previous data visible while background-refetch runs -> no flash of skeleton
    placeholderData: keepPreviousData,
  });

  // Compute enrichedConfig synchronously from API data (no useEffect -> no double-render flash)
  const initialConfig = useMemo<LandingPageConfig | null>(() => {
    if (!data?.data?.config) return null;
    const c = data.data.config;
    const brand = rawTenantCode.toUpperCase();
    return {
      ...c,
      header: {
        ...c.header,
        slogan: c.header?.slogan || t("tenantAdmin.landing.editor.defaults.slogan"),
      },
      hero: {
        ...c.hero,
        bannerImageUrl: c.hero?.bannerImageUrl || "/acme_tech_hero.png",
        bannerHeight: c.hero?.bannerHeight || "540px",
        title: c.hero?.title || t("tenantAdmin.landing.editor.defaults.heroTitle", { brand }),
        badgeText: c.hero?.badgeText || t("tenantAdmin.landing.editor.defaults.heroBadge"),
        highlightWords: c.hero?.highlightWords || brand,
        subtitle: c.hero?.subtitle || t("tenantAdmin.landing.editor.defaults.heroSubtitle"),
      },
      about: {
        ...c.about,
        cultureImageUrl: c.about?.cultureImageUrl || "/acme_culture.png",
        badge: c.about?.badge || t("tenantAdmin.landing.editor.defaults.aboutBadge"),
        title: c.about?.title || t("tenantAdmin.landing.editor.defaults.aboutTitle", { brand }),
        description:
          c.about?.description ||
          t("tenantAdmin.landing.editor.defaults.aboutDescription", { brand }),
        stats:
          c.about?.stats && c.about.stats.length > 0
            ? c.about.stats
            : [
                { icon: "Users", value: "500+", label: t("tenantAdmin.landing.editor.defaults.stat1Label") },
                { icon: "Zap", value: "99.99%", label: t("tenantAdmin.landing.editor.defaults.stat2Label") },
                { icon: "Award", value: "100%", label: t("tenantAdmin.landing.editor.defaults.stat3Label") },
                { icon: "Globe", value: "Global", label: t("tenantAdmin.landing.editor.defaults.stat4Label") },
              ],
      },
      benefits: {
        ...c.benefits,
        enabled: c.benefits?.enabled ?? true,
        badge: c.benefits?.badge || t("tenantAdmin.landing.editor.defaults.benefitsBadge"),
        title: c.benefits?.title || t("tenantAdmin.landing.editor.defaults.benefitsTitle"),
        subtitle: c.benefits?.subtitle || t("tenantAdmin.landing.editor.defaults.benefitsSubtitle"),
        items:
          c.benefits?.items && c.benefits.items.length > 0
            ? c.benefits.items
            : [
                {
                  icon: "HeartHandshake",
                  title: t("tenantAdmin.landing.editor.defaults.benefit1Title"),
                  description: t("tenantAdmin.landing.editor.defaults.benefit1Desc"),
                },
                {
                  icon: "Laptop",
                  title: t("tenantAdmin.landing.editor.defaults.benefit2Title"),
                  description: t("tenantAdmin.landing.editor.defaults.benefit2Desc"),
                },
                {
                  icon: "TrendingUp",
                  title: t("tenantAdmin.landing.editor.defaults.benefit3Title"),
                  description: t("tenantAdmin.landing.editor.defaults.benefit3Desc"),
                },
                {
                  icon: "Coffee",
                  title: t("tenantAdmin.landing.editor.defaults.benefit4Title"),
                  description: t("tenantAdmin.landing.editor.defaults.benefit4Desc"),
                },
              ],
      },
      techStack: {
        ...c.techStack,
        enabled: c.techStack?.enabled ?? true,
        badge: c.techStack?.badge || t("tenantAdmin.landing.editor.defaults.techBadge"),
        title: c.techStack?.title || t("tenantAdmin.landing.editor.defaults.techTitle"),
        subtitle: c.techStack?.subtitle || t("tenantAdmin.landing.editor.defaults.techSubtitle"),
        tags:
          c.techStack?.tags && c.techStack.tags.length > 0
            ? c.techStack.tags
            : ["Java 21", "Spring Boot", "React", "TypeScript", "Docker", "Kubernetes", "Redis", "RabbitMQ", "MySQL", "AI / Machine Learning"],
      },
      testimonials: {
        ...c.testimonials,
        enabled: c.testimonials?.enabled ?? true,
        badge: c.testimonials?.badge || t("tenantAdmin.landing.editor.defaults.testimonialsBadge"),
        title: c.testimonials?.title || t("tenantAdmin.landing.editor.defaults.testimonialsTitle"),
        items:
          c.testimonials?.items && c.testimonials.items.length > 0
            ? c.testimonials.items
            : [
                {
                  name: "Minh Quân",
                  role: "Senior Software Engineer",
                  avatarUrl: "",
                  quote: t("tenantAdmin.landing.editor.defaults.testimonial1Quote", { brand }),
                },
                {
                  name: "Thu Hà",
                  role: "Tech Lead / Architect",
                  avatarUrl: "",
                  quote: t("tenantAdmin.landing.editor.defaults.testimonial2Quote"),
                },
              ],
      },
      footer: {
        ...c.footer,
        description: c.footer?.description || t("tenantAdmin.landing.editor.defaults.footerDescription"),
        contactTitle: c.footer?.contactTitle || t("tenantAdmin.landing.editor.defaults.footerContactTitle"),
        socialTitle: c.footer?.socialTitle || t("tenantAdmin.landing.editor.defaults.footerSocialTitle"),
        bottomText: c.footer?.bottomText || t("tenantAdmin.landing.editor.defaults.footerBottomText"),
      },
    };
  }, [data, rawTenantCode, t]);

  // Local editable state - null until user makes first edit (initial render uses initialConfig directly)
  const [config, setConfig] = useState<LandingPageConfig | null>(null);

  // Merge: prefer local user edits (config), fall back to server data (initialConfig)
  const effectiveConfig = config ?? initialConfig;

  const updateMutation = useMutation({
    mutationFn: landingApi.updateLandingPage,
    onSuccess: (res) => {
      queryClient.setQueryData(["tenant-landing-page"], res);
      queryClient.invalidateQueries({ queryKey: ["public-landing"] });
      toast.success(
        res.data?.published
          ? t("tenantAdmin.landing.editor.publishedToast")
          : t("tenantAdmin.landing.editor.draftToast"),
      );
    },
    onError: (err) => {
      toast.danger(getApiErrorMessage(err, t("tenantAdmin.landing.editor.saveError")));
    },
  });

  const resetMutation = useMutation({
    mutationFn: landingApi.resetLandingPage,
    onSuccess: (res) => {
      queryClient.setQueryData(["tenant-landing-page"], res);
      queryClient.invalidateQueries({ queryKey: ["public-landing"] });
      if (res.data?.config) {
        setConfig(res.data.config);
      }
      toast.success(t("tenantAdmin.landing.editor.resetToast"));
    },
    onError: (err) => {
      toast.danger(getApiErrorMessage(err, t("tenantAdmin.landing.editor.resetError")));
    },
  });

  if (isLoading || !effectiveConfig) {
    return <PageSkeleton />;
  }

  if (isError) {
    return (
      <section className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("tenantAdmin.landing.editor.loadTitle")}</h1>
        <p className="text-red-600">{getApiErrorMessage(error, t("tenantAdmin.landing.editor.loadError"))}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          {t("tenantAdmin.landing.editor.retry")}
        </Button>
      </section>
    );
  }

  // --- Handlers for Deep Nested Updates ---
  const updateHeader = (patch: Partial<LandingPageConfig["header"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, header: { ...base.header, ...patch } };
    });
  const updateTheme = (patch: Partial<LandingPageConfig["theme"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, theme: { ...base.theme, ...patch } };
    });
  const updateHero = (patch: Partial<LandingPageConfig["hero"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, hero: { ...base.hero, ...patch } };
    });
  const updateAbout = (patch: Partial<LandingPageConfig["about"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, about: { ...base.about, ...patch } };
    });
  const updateBenefits = (patch: Partial<LandingPageConfig["benefits"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, benefits: { ...base.benefits, ...patch } };
    });
  const updateTechStack = (patch: Partial<LandingPageConfig["techStack"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, techStack: { ...base.techStack, ...patch } };
    });
  const updateTestimonials = (patch: Partial<LandingPageConfig["testimonials"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, testimonials: { ...base.testimonials, ...patch } };
    });
  const updateFooter = (patch: Partial<LandingPageConfig["footer"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, footer: { ...base.footer, ...patch } };
    });
  const updateSeo = (patch: Partial<LandingPageConfig["seo"]>) =>
    setConfig((prev) => {
      const base = prev ?? initialConfig!;
      return { ...base, seo: { ...base.seo, ...patch } };
    });

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await landingApi.uploadImage(file);
      if (res.data?.url) {
        onUploaded(res.data.url);
        toast.success(t("tenantAdmin.landing.editor.uploadSuccess"));
      }
    } catch (err) {
      toast.danger(getApiErrorMessage(err, t("tenantAdmin.landing.editor.uploadError")));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = (publish: boolean) => {
    if (!effectiveConfig) return;
    updateMutation.mutate({ config: effectiveConfig, publish });
  };

  const handleReset = () => {
    if (window.confirm(t("tenantAdmin.landing.editor.resetConfirm"))) {
      resetMutation.mutate();
    }
  };

  const openDrawerTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsDrawerOpen(true);
  };

  const handleAddInlineTag = () => {
    const tag = inlineNewTag.trim();
    if (!tag) return;
    if (!effectiveConfig.techStack.tags.includes(tag)) {
      updateTechStack({ tags: [...effectiveConfig.techStack.tags, tag] });
    }
    setInlineNewTag("");
  };

  const primary = effectiveConfig.theme.primaryColor || "#0058be";
  const brandName = rawTenantCode.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 text-slate-900 flex flex-col overflow-hidden font-sans select-none">
      {/* TOP FULLSCREEN TOOLBAR */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 z-50 text-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`flex items-center justify-center p-2 rounded-lg transition-all border ${
              isDrawerOpen
                ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 shadow-sm"
            }`}
            title={
              isDrawerOpen
                ? t("tenantAdmin.landing.editor.closeSettingsTitle")
                : t("tenantAdmin.landing.editor.customizeTitle")
            }
          >
            <Menu className="w-4 h-4 text-cyan-600" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/internal/admin")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("tenantAdmin.landing.editor.backToAdmin")}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 tracking-tight">{brandName}</span>

            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                data?.data?.published
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {data?.data?.published
                ? t("tenantAdmin.landing.editor.publishedBadge")
                : t("tenantAdmin.landing.editor.draftBadge")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* DEVICE SIMULATOR TOOLBAR */}
          <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-2 py-1 shadow-sm relative">
            {/* View Mode Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsViewModeMenuOpen(!isViewModeMenuOpen)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900 relative group"
            >
              {viewMode === "desktop" && <Monitor className="w-4 h-4" />}
              {viewMode === "tablet" && <Tablet className="w-4 h-4" />}
              {viewMode === "mobile" && <Smartphone className="w-4 h-4" />}

              {/* Custom Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs rounded-full whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[120]">
                {t("tenantAdmin.landing.editor.selectDevicePreview")}
              </div>
            </button>

            {/* View Mode Dropdown Menu */}
            <div
              className={`absolute top-full left-0 mt-2 w-max min-w-[200px] bg-white rounded-2xl border border-slate-200 shadow-xl py-1 z-[100] origin-top-left transition-all duration-200 ease-out ${
                isViewModeMenuOpen
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode("desktop");
                  setIsViewModeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  viewMode === "desktop" ? "text-slate-900 font-medium" : "text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-slate-400" />
                  <span className="text-xs whitespace-nowrap">
                    {t("tenantAdmin.landing.editor.currentScreenSize")}
                  </span>
                </div>
                {viewMode === "desktop" && <Check className="w-3.5 h-3.5 text-cyan-600" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("mobile");
                  setIsViewModeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  viewMode === "mobile" ? "text-slate-900 font-medium" : "text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  <span>{t("tenantAdmin.landing.editor.mobileDevice")}</span>
                </div>
                {viewMode === "mobile" && <Check className="w-3.5 h-3.5 text-cyan-600" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("tablet");
                  setIsViewModeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  viewMode === "tablet" ? "text-slate-900 font-medium" : "text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-slate-400" />
                  <span>{t("tenantAdmin.landing.editor.tabletDevice")}</span>
                </div>
                {viewMode === "tablet" && <Check className="w-3.5 h-3.5 text-cyan-600" />}
              </button>
            </div>

            <div className="text-slate-300 pointer-events-none mx-1 text-lg font-light">/</div>

            <button
              type="button"
              onClick={() => {
                refetch();
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900 relative group"
            >
              <RotateCcw className="w-4 h-4" />

              {/* Custom Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs rounded-full whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[120]">
                {t("tenantAdmin.landing.editor.reloadTooltip")}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch((err) => console.log(err));
                } else {
                  document.exitFullscreen().catch((err) => console.log(err));
                }
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900 relative group"
            >
              <Maximize className="w-4 h-4" />

              {/* Custom Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs rounded-full whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[120]">
                {t("tenantAdmin.landing.editor.fullscreenTooltip")}
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowVisualControls(!showVisualControls)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showVisualControls
                ? "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:text-slate-800 shadow-sm"
            }`}
          >
            <Wand2 className={`w-3.5 h-3.5 ${showVisualControls ? "" : "opacity-50 grayscale"}`} />
            <span>
              {showVisualControls
                ? t("tenantAdmin.landing.editor.editButtonsOn")
                : t("tenantAdmin.landing.editor.editButtonsOff")}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.open("/career", "_blank")}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t("tenantAdmin.landing.editor.openLiveSite")}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t("tenantAdmin.landing.editor.resetButton")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t("tenantAdmin.landing.editor.saveDraftButton")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md transition-all hover:opacity-95"
            style={{ backgroundColor: primary }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t("tenantAdmin.landing.editor.publishButton")}</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        <LandingEditorDrawer
          isDrawerOpen={isDrawerOpen}
          setIsDrawerOpen={setIsDrawerOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          config={effectiveConfig}
          updateHeader={updateHeader}
          updateTheme={updateTheme}
          updateHero={updateHero}
          updateAbout={updateAbout}
          updateBenefits={updateBenefits}
          updateTechStack={updateTechStack}
          updateTestimonials={updateTestimonials}
          updateFooter={updateFooter}
          updateSeo={updateSeo}
          handleFileUpload={handleFileUpload}
          isUploading={isUploading}
          newTagInput={newTagInput}
          setNewTagInput={setNewTagInput}
        />

        <LandingEditorCanvas
          config={effectiveConfig}
          brandName={brandName}
          viewMode={viewMode}
          showVisualControls={showVisualControls}
          activeTab={activeTab}
          isDrawerOpen={isDrawerOpen}
          openDrawerTab={openDrawerTab}
          updateHeader={updateHeader}
          updateTheme={updateTheme}
          updateHero={updateHero}
          updateAbout={updateAbout}
          updateBenefits={updateBenefits}
          updateTechStack={updateTechStack}
          updateTestimonials={updateTestimonials}
          updateFooter={updateFooter}
          handleFileUpload={handleFileUpload}
          isUploading={isUploading}
          inlineNewTag={inlineNewTag}
          setInlineNewTag={setInlineNewTag}
          handleAddInlineTag={handleAddInlineTag}
        />
      </div>
    </div>
  );
}
