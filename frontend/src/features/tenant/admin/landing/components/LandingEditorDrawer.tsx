import React from "react";
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
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import type { LandingPageConfig } from "../types/landing";
import { COLOR_PRESETS, FONT_OPTIONS, BORDER_RADIUS_OPTIONS, BANNER_HEIGHT_OPTIONS, inputClass, labelClass } from "../utils/constants";

interface LandingEditorDrawerProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (val: string) => void;
  config: LandingPageConfig;
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
  const {
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab,
    config,
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

  const tabs = [
    { id: "theme", label: "Màu & Font", icon: Palette },
    { id: "hero", label: "Hero Banner", icon: LayoutTemplate },
    { id: "about", label: "Văn Hóa", icon: Building2 },
    { id: "benefits", label: "Phúc Lợi", icon: Gift },
    { id: "techStack", label: "Tech Stack", icon: Code2 },
    { id: "testimonials", label: "Đánh Giá", icon: MessageSquareQuote },
    { id: "footer", label: "Chân Trang", icon: Globe2 },
    { id: "seo", label: "SEO Meta", icon: Search },
  ];

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
              <h2 className="text-sm font-bold text-slate-900">Bảng Cài Đặt Chi Tiết</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Đóng bảng cài đặt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector Pills */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-slate-50/50 [scrollbar-width:none]">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive ? "bg-brand-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-800">
            {/* TAB: THEME */}
            {activeTab === "theme" && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Màu Chủ Đạo Thương Hiệu (Brand Palette)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COLOR_PRESETS.map((p) => (
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
                        <span>{p.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 mb-1 block">Mã màu HEX (Primary):</span>
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
                      <span className="text-[11px] text-slate-500 mb-1 block">Màu phụ (Secondary):</span>
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
                  <label className={labelClass}>Bộ Font Chữ Hiển Thị (Font Family)</label>
                  <select
                    value={config.theme.fontFamily}
                    onChange={(e) => updateTheme({ fontFamily: e.target.value })}
                    className={inputClass}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Bo Góc Thẻ (Border Radius)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BORDER_RADIUS_OPTIONS.map((opt) => (
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
                  <label className={labelClass}>Huy Hiệu (Badge Slogan)</label>
                  <input
                    type="text"
                    value={config.hero.badgeText}
                    onChange={(e) => updateHero({ badgeText: e.target.value })}
                    placeholder="Ví dụ: Đổi Mới Sáng Tạo & Đột Phá"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Tiêu Đề Chính (Headline)</label>
                  <input
                    type="text"
                    value={config.hero.title}
                    onChange={(e) => updateHero({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Từ Khóa Highlight Gradient</label>
                  <input
                    type="text"
                    value={config.hero.highlightWords}
                    onChange={(e) => updateHero({ highlightWords: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Đoạn Giới Thiệu Ngắn (Subtitle)</label>
                  <textarea
                    rows={3}
                    value={config.hero.subtitle}
                    onChange={(e) => updateHero({ subtitle: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Ảnh Banner Hero</label>
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-primary text-white text-[11px] font-semibold hover:opacity-95">
                      <Upload className="w-3 h-3" />
                      <span>{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
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
                    placeholder="https://example.com/banner.png hoặc tải ảnh từ máy tính"
                    className={inputClass}
                  />

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className={labelClass}>Chiều Cao Banner</label>
                      <select
                        value={config.hero.bannerHeight || "540px"}
                        onChange={(e) => updateHero({ bannerHeight: e.target.value })}
                        className={inputClass}
                      >
                        {BANNER_HEIGHT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Độ Mờ Phủ ({config.hero.overlayOpacity ?? 70}%)</label>
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
                    <label className={labelClass}>Nút Kêu Gọi Chính</label>
                    <input
                      type="text"
                      value={config.hero.primaryCtaText}
                      onChange={(e) => updateHero({ primaryCtaText: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nút Kêu Gọi Phụ</label>
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
                    <span>Hiện thanh tìm việc làm trong Banner</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB: ABOUT */}
            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">Bật hiển thị khối Văn Hóa</label>
                  <input
                    type="checkbox"
                    checked={config.about.enabled}
                    onChange={(e) => updateAbout({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>Tiêu Đề Khối</label>
                  <input
                    type="text"
                    value={config.about.title}
                    onChange={(e) => updateAbout({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Đoạn Giới Thiệu Văn Hóa</label>
                  <textarea
                    rows={4}
                    value={config.about.description}
                    onChange={(e) => updateAbout({ description: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Ảnh Hoạt Động / Văn Hóa</label>
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-primary text-white text-[11px] font-semibold">
                      <Upload className="w-3 h-3" />
                      <span>Tải ảnh</span>
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
                    placeholder="https://example.com/culture.png hoặc tải ảnh từ máy tính"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* TAB: BENEFITS */}
            {activeTab === "benefits" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">Bật hiển thị khối Phúc Lợi</label>
                  <input
                    type="checkbox"
                    checked={config.benefits.enabled}
                    onChange={(e) => updateBenefits({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>Tiêu Đề Khối</label>
                  <input
                    type="text"
                    value={config.benefits.title}
                    onChange={(e) => updateBenefits({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Mô Tả Phụ (Subtitle)</label>
                  <input
                    type="text"
                    value={config.benefits.subtitle}
                    onChange={(e) => updateBenefits({ subtitle: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* TAB: TECH STACK */}
            {activeTab === "techStack" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">Bật hiển thị khối Tech Stack</label>
                  <input
                    type="checkbox"
                    checked={config.techStack.enabled}
                    onChange={(e) => updateTechStack({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>Tiêu Đề Khối</label>
                  <input
                    type="text"
                    value={config.techStack.title}
                    onChange={(e) => updateTechStack({ title: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Mô Tả Phụ</label>
                  <input
                    type="text"
                    value={config.techStack.subtitle}
                    onChange={(e) => updateTechStack({ subtitle: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Gắn Thẻ Công Nghệ Mới</label>
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
                      placeholder="Ví dụ: Java 21, React..."
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
                      Thêm
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TESTIMONIALS */}
            {activeTab === "testimonials" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-900">Bật hiển thị khối Đánh Giá</label>
                  <input
                    type="checkbox"
                    checked={config.testimonials.enabled}
                    onChange={(e) => updateTestimonials({ enabled: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                </div>

                <div>
                  <label className={labelClass}>Tiêu Đề Khối</label>
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
                    <label className={labelClass}>Email Tuyển Dụng</label>
                    <input
                      type="email"
                      value={config.footer.contactEmail || ""}
                      onChange={(e) => updateFooter({ contactEmail: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hotline</label>
                    <input
                      type="text"
                      value={config.footer.contactPhone || ""}
                      onChange={(e) => updateFooter({ contactPhone: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Địa Chỉ Trụ Sở</label>
                  <input
                    type="text"
                    value={config.footer.address || ""}
                    onChange={(e) => updateFooter({ address: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>LinkedIn URL</label>
                    <input
                      type="url"
                      value={config.footer.linkedinUrl || ""}
                      onChange={(e) => updateFooter({ linkedinUrl: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Facebook URL</label>
                    <input
                      type="url"
                      value={config.footer.facebookUrl || ""}
                      onChange={(e) => updateFooter({ facebookUrl: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Dòng Bản Quyền</label>
                  <input
                    type="text"
                    value={config.footer.copyrightText}
                    onChange={(e) => updateFooter({ copyrightText: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* TAB: SEO */}
            {activeTab === "seo" && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Meta Title</label>
                  <input
                    type="text"
                    value={config.seo.metaTitle}
                    onChange={(e) => updateSeo({ metaTitle: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Meta Description</label>
                  <textarea
                    rows={3}
                    value={config.seo.metaDescription}
                    onChange={(e) => updateSeo({ metaDescription: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>OG Share Image URL</label>
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
