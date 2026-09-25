import React from "react";
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
  SlidersHorizontal,
  Edit3,
  Sparkles,
} from "lucide-react";
import type { LandingPageConfig, StatItem, BenefitItem, TestimonialItem } from "../types/landing";
import { BANNER_HEIGHT_OPTIONS } from "../utils/constants";
import { renderIcon } from "../utils/icons";

interface LandingEditorCanvasProps {
  config: LandingPageConfig;
  brandName: string;
  viewMode: "desktop" | "mobile";
  showVisualControls: boolean;
  openDrawerTab: (tabId: string) => void;
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
  const {
    config,
    brandName,
    viewMode,
    showVisualControls,
    openDrawerTab,
    updateTheme,
    updateHero,
    updateAbout,
    updateBenefits,
    updateTechStack,
    updateTestimonials,
    handleFileUpload,
    isUploading,
    inlineNewTag,
    setInlineNewTag,
    handleAddInlineTag,
  } = props;

  const primary = config.theme.primaryColor || "#0058be";
  const isDarkHero = config.theme.darkModeHero !== false;
  const isMobile = viewMode === "mobile";

  const validStats = (config.about.stats || []).filter((s) => s.value?.trim() || s.label?.trim());
  const validBenefits = (config.benefits.items || []).filter((b) => b.title?.trim() || b.description?.trim());
  const validTags = (config.techStack.tags || []).filter((t) => t?.trim());
  const validTestimonials = (config.testimonials.items || []).filter((t) => t.name?.trim() || t.quote?.trim());

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950 p-2 sm:p-5 flex justify-center items-start">
      <div
        className={`transition-all duration-300 bg-white text-slate-900 shadow-2xl relative ${
          isMobile
            ? "w-[390px] min-h-[844px] rounded-[44px] border-[10px] border-slate-900 ring-4 ring-slate-800 my-4 text-xs overflow-hidden"
            : "w-full max-w-7xl rounded-2xl border border-slate-800 text-sm overflow-hidden"
        }`}
        style={{ fontFamily: config.theme.fontFamily || "Inter" }}
      >
        {/* CANVAS NAV HEADER */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between relative group">
          {showVisualControls && (
            <div className="absolute top-2 right-4 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => openDrawerTab("theme")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold shadow hover:bg-slate-800"
              >
                <Palette className="w-3 h-3 text-cyan-400" />
                <span>Đổi Màu & Font</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-base shadow-sm"
              style={{ backgroundColor: primary }}
            >
              {brandName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">{brandName}</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  Careers
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Cổng Tuyển Dụng Nhân Tài</span>
            </div>
          </div>

          {!isMobile && (
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-600">
              <span className="hover:text-slate-900 cursor-pointer">Về Chúng Tôi</span>
              {config.benefits.enabled && <span className="hover:text-slate-900 cursor-pointer">Đãi Ngộ</span>}
              <span className="hover:text-slate-900 cursor-pointer">Tech Stack</span>
              <span className="hover:text-slate-900 cursor-pointer">Việc Làm</span>
            </div>
          )}

          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            style={{ backgroundColor: primary }}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
        </header>

        {/* SECTION 1: HERO BANNER */}
        <section className="relative px-3 sm:px-6 pt-4 pb-8 group">
          <div
            className={`relative overflow-hidden ${config.theme.borderRadius || "rounded-2xl"} shadow-xl transition-all duration-300`}
            style={{
              minHeight: isMobile ? "380px" : config.hero.bannerHeight || "540px",
              backgroundColor: isDarkHero ? "#020617" : "#ffffff",
            }}
          >
            {config.hero.bannerImageUrl ? (
              <img
                src={config.hero.bannerImageUrl}
                alt="Hero Banner"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : (
              <div
                className="absolute inset-0 opacity-40 mix-blend-overlay"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${primary}60 0%, transparent 70%)`,
                }}
              />
            )}

            <div
              className="absolute inset-0"
              style={{
                backgroundColor: isDarkHero ? "#020617" : "#f8fafc",
                opacity: (config.hero.overlayOpacity ?? 70) / 100,
              }}
            />

            {showVisualControls && (
              <div className="absolute top-4 right-4 z-30 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-2xl text-white text-xs">
                <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  Chiều cao:
                </span>
                {BANNER_HEIGHT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateHero({ bannerHeight: opt.value })}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      (config.hero.bannerHeight || "540px") === opt.value
                        ? "bg-brand-primary text-white shadow-sm ring-1 ring-white/20"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}

                <div className="h-4 w-px bg-slate-700 mx-1" />

                <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold border border-slate-700">
                  <Upload className="w-3 h-3 text-cyan-400" />
                  <span>{isUploading ? "Đang tải..." : "Đổi ảnh banner"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => handleFileUpload(e, (url) => updateHero({ bannerImageUrl: url }))}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => updateTheme({ darkModeHero: !isDarkHero })}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700"
                >
                  {isDarkHero ? "🌙 Nền Tối" : "☀️ Nền Sáng"}
                </button>

                <button
                  type="button"
                  onClick={() => openDrawerTab("hero")}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1 shadow"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Sửa Chữ & Nút</span>
                </button>
              </div>
            )}

            <div
              className={`relative z-10 p-6 sm:p-12 md:p-16 flex flex-col justify-center h-full max-w-3xl ${
                isDarkHero ? "text-white" : "text-slate-900"
              }`}
            >
              {config.hero.badgeText && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 self-start border backdrop-blur-md"
                  style={{
                    backgroundColor: isDarkHero ? "rgba(255,255,255,0.12)" : `${primary}15`,
                    borderColor: isDarkHero ? "rgba(255,255,255,0.2)" : `${primary}30`,
                    color: isDarkHero ? "#67e8f9" : primary,
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{config.hero.badgeText}</span>
                </div>
              )}

              <h1
                className={`font-extrabold tracking-tight leading-tight mb-4 ${
                  isMobile ? "text-2xl" : "text-3xl sm:text-4xl md:text-5xl"
                }`}
              >
                {config.hero.title || `Cơ Hội Nghề Nghiệp Tại ${brandName}`}
                {config.hero.highlightWords && (
                  <span className="block bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent mt-1">
                    {config.hero.highlightWords}
                  </span>
                )}
              </h1>

              {config.hero.subtitle && (
                <p
                  className={`mb-6 leading-relaxed ${
                    isMobile ? "text-xs" : "text-sm sm:text-base text-slate-300"
                  } ${isDarkHero ? "text-slate-300" : "text-slate-600"}`}
                >
                  {config.hero.subtitle}
                </p>
              )}

              {config.hero.showSearchBar && (
                <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl border border-white/30 shadow-2xl flex items-center gap-2 max-w-xl mb-6">
                  <Search className="w-4 h-4 text-slate-400 ml-2" />
                  <input
                    type="text"
                    readOnly
                    placeholder="Tìm kiếm vị trí tuyển dụng, kỹ năng..."
                    className="bg-transparent text-xs text-slate-800 placeholder-slate-400 flex-1 outline-none font-medium"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                    style={{ backgroundColor: primary }}
                  >
                    <span>Tìm Kiếm</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg"
                  style={{ backgroundColor: primary }}
                >
                  <span>{config.hero.primaryCtaText || "Xem Vị Trí Tuyển Dụng"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {config.hero.secondaryCtaText && (
                  <button
                    type="button"
                    className={`px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all ${
                      isDarkHero
                        ? "border-white/30 text-white hover:bg-white/10"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {config.hero.secondaryCtaText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CULTURE & ABOUT */}
        {config.about.enabled && (
          <section className="py-12 px-6 bg-white border-y border-slate-100 relative group">
            {showVisualControls && (
              <div className="absolute top-4 right-6 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDrawerTab("about")}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold shadow hover:bg-slate-800"
                >
                  <Edit3 className="w-3 h-3 text-cyan-400" />
                  <span>Sửa Khối Văn Hóa</span>
                </button>
              </div>
            )}

            <div className="max-w-6xl mx-auto space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${primary}15`, color: primary }}
                  >
                    {config.about.badge || "Về Chúng Tôi"}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {config.about.title || `Về ${brandName}`}
                  </h2>
                  {config.about.description ? (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {config.about.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Chưa nhập lời giới thiệu văn hóa. Bấm "Sửa Khối Văn Hóa" để cập nhật.
                    </p>
                  )}
                </div>

                <div className="lg:col-span-5 relative group/img">
                  {config.about.cultureImageUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md max-h-[300px]">
                      <img
                        src={config.about.cultureImageUrl}
                        alt="Văn hóa công ty"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-400 text-xs text-center">
                      <Building2 className="w-8 h-8 mb-2 opacity-50" />
                      <span>Chưa có ảnh hoạt động</span>
                    </div>
                  )}

                  {showVisualControls && (
                    <div className="absolute bottom-3 right-3">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-xs font-semibold shadow hover:bg-slate-800">
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Đổi ảnh văn hóa</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (url) => updateAbout({ cultureImageUrl: url }))}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Số Liệu Nổi Bật ({validStats.length})
                  </span>
                  {showVisualControls && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextStats: StatItem[] = [
                          ...(config.about.stats || []),
                          { icon: "Users", value: "100+", label: "Nhân sự" },
                        ];
                        updateAbout({ stats: nextStats });
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-brand-primary" />
                      <span>+ Thêm số liệu</span>
                    </button>
                  )}
                </div>

                {validStats.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
                    Chưa có số liệu nổi bật. Bấm "+ Thêm số liệu" để tạo mới.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {config.about.stats.map((st, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative group/stat"
                      >
                        {showVisualControls && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = config.about.stats.filter((_, idx) => idx !== i);
                              updateAbout({ stats: copy });
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover/stat:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                            title="Xóa số liệu này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${primary}15`, color: primary }}
                          >
                            {renderIcon(st.icon, "w-3.5 h-3.5")}
                          </div>
                          <span className="font-extrabold text-lg text-slate-900">{st.value}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{st.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: PERKS & BENEFITS */}
        {config.benefits.enabled && (
          <section className="py-12 px-6 bg-slate-50/70 border-b border-slate-100 relative group">
            {showVisualControls && (
              <div className="absolute top-4 right-6 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextItems: BenefitItem[] = [
                      ...(config.benefits.items || []),
                      {
                        icon: "HeartHandshake",
                        title: "Chế Độ Mới",
                        description: "Mô tả chi tiết quyền lợi đãi ngộ...",
                      },
                    ];
                    updateBenefits({ items: nextItems });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold shadow hover:bg-slate-800"
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  <span>+ Thêm Thẻ Phúc Lợi</span>
                </button>

                <button
                  type="button"
                  onClick={() => openDrawerTab("benefits")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Sửa Tiêu Đề</span>
                </button>
              </div>
            )}

            <div className="max-w-6xl mx-auto space-y-8">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  {config.benefits.badge || "Đãi Ngộ"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {config.benefits.title || "Chế Độ Đãi Ngộ & Phúc Lợi"}
                </h2>
                {config.benefits.subtitle && (
                  <p className="text-xs text-slate-500">{config.benefits.subtitle}</p>
                )}
              </div>

              {validBenefits.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-xs">
                  Chưa có thẻ phúc lợi nào. Bấm "+ Thêm Thẻ Phúc Lợi" để tạo mới.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {config.benefits.items.map((b, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative group/card"
                    >
                      {showVisualControls && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = config.benefits.items.filter((_, idx) => idx !== i);
                            updateBenefits({ items: copy });
                          }}
                          className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                          title="Xóa thẻ phúc lợi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${primary}15`, color: primary }}
                      >
                        {renderIcon(b.icon, "w-5 h-5")}
                      </div>
                      <h3 className="font-bold text-sm text-slate-800 mb-1">{b.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{b.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 4: TECH STACK */}
        {config.techStack.enabled && (
          <section className="py-12 px-6 bg-white border-b border-slate-100 relative group">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  {config.techStack.badge || "Tech Stack"}
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  {config.techStack.title || "Công Nghệ & Kỹ Năng"}
                </h2>
                {config.techStack.subtitle && (
                  <p className="text-xs text-slate-500">{config.techStack.subtitle}</p>
                )}
              </div>

              {showVisualControls && (
                <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                  <input
                    type="text"
                    value={inlineNewTag}
                    onChange={(e) => setInlineNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInlineTag();
                      }
                    }}
                    placeholder="Gõ tên công nghệ (vd: Java 21) rồi ấn Enter"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs flex-1 outline-none focus:border-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddInlineTag}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    Thêm Thẻ
                  </button>
                </div>
              )}

              {validTags.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                  Chưa gắn thẻ công nghệ nào. Nhập tên ở trên để thêm vào trang.
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {config.techStack.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-800 shadow-sm"
                    >
                      <span>{tag}</span>
                      {showVisualControls && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = config.techStack.tags.filter((t) => t !== tag);
                            updateTechStack({ tags: next });
                          }}
                          className="text-slate-400 hover:text-red-600 font-bold ml-1"
                          title="Xóa thẻ này"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 5: TESTIMONIALS */}
        {config.testimonials.enabled && (
          <section className="py-12 px-6 bg-slate-50/70 border-b border-slate-100 relative group">
            {showVisualControls && (
              <div className="absolute top-4 right-6 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextItems: TestimonialItem[] = [
                      ...(config.testimonials.items || []),
                      {
                        name: "Thành viên mới",
                        role: "Kỹ sư phần mềm",
                        avatarUrl: "",
                        quote: "Môi trường công nghệ chuyên nghiệp và cơ hội thăng tiến rộng mở.",
                      },
                    ];
                    updateTestimonials({ items: nextItems });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold shadow hover:bg-slate-800"
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  <span>+ Thêm Đánh Giá</span>
                </button>
              </div>
            )}

            <div className="max-w-5xl mx-auto space-y-8">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <span
                  className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  {config.testimonials.badge || "Đội Ngũ"}
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  {config.testimonials.title || "Đánh Giá Từ Đội Ngũ Nhân Viên"}
                </h2>
              </div>

              {validTestimonials.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-xs">
                  Chưa có trích dẫn đánh giá nào. Bấm "+ Thêm Đánh Giá" để tạo mới.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.testimonials.items.map((item, i) => (
                    <div
                      key={i}
                      className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative group/quote"
                    >
                      {showVisualControls && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = config.testimonials.items.filter((_, idx) => idx !== i);
                            updateTestimonials({ items: copy });
                          }}
                          className="absolute top-3 right-3 opacity-0 group-hover/quote:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                          title="Xóa đánh giá này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <p className="text-xs text-slate-600 italic mb-4 leading-relaxed">
                        "{item.quote}"
                      </p>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
                          style={{ backgroundColor: primary }}
                        >
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={item.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            item.name?.charAt(0) || "U"
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 6: FOOTER */}
        <footer className="py-10 px-6 bg-slate-900 text-slate-400 text-xs relative group">
          {showVisualControls && (
            <div className="absolute top-4 right-6 z-30">
              <button
                type="button"
                onClick={() => openDrawerTab("footer")}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-white text-xs font-semibold shadow hover:bg-slate-700 border border-slate-700"
              >
                <Edit3 className="w-3 h-3 text-cyan-400" />
                <span>Sửa Chân Trang & Liên Hệ</span>
              </button>
            </div>
          )}

          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2 max-w-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center text-xs"
                    style={{ backgroundColor: primary }}
                  >
                    {brandName.charAt(0)}
                  </div>
                  <span className="font-bold text-white text-sm">{brandName}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cổng thông tin tuyển dụng & cơ hội phát triển nghề nghiệp chuẩn Enterprise.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <span className="font-bold text-white uppercase tracking-wider block mb-2">Liên Hệ Tuyển Dụng</span>
                {config.footer.address && (
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 shrink-0" />
                    <span>{config.footer.address}</span>
                  </div>
                )}
                {config.footer.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{config.footer.contactEmail}</span>
                  </div>
                )}
                {config.footer.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{config.footer.contactPhone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="font-bold text-white uppercase tracking-wider block text-[11px]">Mạng Xã Hội</span>
                <div className="flex items-center gap-3 text-slate-300">
                  {config.footer.linkedinUrl && <Linkedin className="w-4 h-4 cursor-pointer hover:text-white" />}
                  {config.footer.facebookUrl && <Facebook className="w-4 h-4 cursor-pointer hover:text-white" />}
                  {config.footer.githubUrl && <Github className="w-4 h-4 cursor-pointer hover:text-white" />}
                  {config.footer.websiteUrl && <Globe className="w-4 h-4 cursor-pointer hover:text-white" />}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
              <div>
                {config.footer.copyrightText || `© 2026 ${brandName}. Powered by SmartHire AI.`}
              </div>
              <div>Hệ Thống Tuyển Dụng Doanh Nghiệp Multi-Tenant</div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
