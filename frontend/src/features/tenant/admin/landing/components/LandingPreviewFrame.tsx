import type { LandingPageConfig } from "../types/landing";
import {
  Search,
  ArrowRight,
  LogIn,
  MapPin,
  ChevronRight,
  Quote,
} from "lucide-react";
import "@/features/tenant/candidate/jobs/career-page.css";

interface LandingPreviewFrameProps {
  config: LandingPageConfig;
  brandName: string;
  viewMode: "desktop" | "mobile";
}

export function LandingPreviewFrame({ config, brandName, viewMode }: LandingPreviewFrameProps) {
  const { theme, hero, about, benefits, testimonials, footer } = config;

  const primary = theme.primaryColor || "#008060";
  const primaryHover = theme.primaryHover || primary;
  const secondary = theme.secondaryColor || "#505f76";
  const isDarkHero = theme.darkModeHero !== false;

  const isMobile = viewMode === "mobile";

  const validStats = (about.stats || []).filter((s) => s.value?.trim() || s.label?.trim());
  const validBenefits = (benefits.items || []).filter((b) => b.title?.trim() || b.description?.trim());
  const validTestimonials = (testimonials.items || []).filter((t) => t.name?.trim() || t.quote?.trim());

  const dynamicThemeStyle: React.CSSProperties = {
    fontFamily: theme.fontFamily || "inherit",
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

  return (
    <div
      className={`preview-canvas career-page tenant-workspace-theme transition-all duration-300 bg-white shadow-xl overflow-hidden ${
        isMobile
          ? "w-[375px] mx-auto rounded-[36px] border-[8px] border-slate-900 ring-1 ring-slate-800 text-[13px]"
          : "w-full rounded-2xl border border-slate-200 text-sm"
      }`}
      style={dynamicThemeStyle}
    >
      {/* Mini Browser Bar */}
      <div className="bg-slate-900 text-slate-400 px-4 py-2 flex items-center justify-between text-xs select-none border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
        </div>
        <div className="bg-slate-800/80 rounded-md px-3 py-0.5 text-[11px] text-slate-300 truncate max-w-[200px]">
          https://{brandName.toLowerCase().replace(/[^a-z0-9]/g, "")}.smarthire.top
        </div>
        <div className="text-[10px] uppercase font-semibold text-slate-400">{viewMode}</div>
      </div>

      <div className="max-h-[640px] overflow-y-auto overflow-x-hidden bg-[#f8f9fc] select-none">
        {/* Navigation */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            {config.header?.logoImageUrl ? (
              <img src={config.header.logoImageUrl} alt="Logo" className="h-8 max-w-24 object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-sm shadow-sm"
                style={{ backgroundColor: primary }}
              >
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-bold text-slate-800 text-sm tracking-tight">{brandName}</span>
              <span className="block text-[10px] text-slate-400">
                {config.header?.slogan || "Cổng tuyển dụng nhân tài"}
              </span>
            </div>
          </div>

          {!isMobile && (
            <div className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600">
              <span className="hover:text-slate-900 cursor-pointer">Việc làm</span>
              <span className="hover:text-slate-900 cursor-pointer">Tạo CV</span>
              <span className="hover:text-slate-900 cursor-pointer">Công cụ</span>
              <span className="hover:text-slate-900 cursor-pointer">Về doanh nghiệp</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              style={{ backgroundColor: primary }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          </div>
        </header>

        {/* Discovery Hero Section */}
        <section className="career-discovery-hero px-3 py-6 relative">
          <div className="max-w-4xl mx-auto text-center text-white mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75 mb-1">
              CỔNG TUYỂN DỤNG {brandName}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Tìm công việc phù hợp. Phát triển sự nghiệp cùng {brandName}
            </h1>
          </div>

          {hero.showSearchBar !== false && (
            <div className="career-discovery-search max-w-4xl mx-auto mb-5 grid rounded-xl border border-white/55 bg-white p-1 shadow-md sm:grid-cols-[1fr_200px_auto]">
              <div className="flex items-center px-3 py-2 border-b sm:border-b-0 sm:border-r border-slate-100">
                <Search className="size-3.5 text-slate-400 mr-2" />
                <span className="text-xs text-slate-400">Vị trí tuyển dụng, kỹ năng...</span>
              </div>
              <div className="flex items-center px-3 py-2 sm:border-r border-slate-100">
                <MapPin className="size-3.5 text-[var(--color-primary)] mr-2" />
                <span className="text-xs text-slate-700">Tất cả địa điểm</span>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Search className="size-3.5" />
                <span>Tìm việc</span>
              </button>
            </div>
          )}

          <div className="max-w-4xl mx-auto grid gap-3 sm:grid-cols-[240px_1fr]">
            {/* Categories */}
            <div className="career-category-card rounded-xl border border-white/45 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                <span className="size-7 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold grid place-items-center">
                  {brandName.charAt(0)}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Nhóm nghề nghiệp</h4>
                  <p className="text-[10px] text-slate-500">Khám phá theo phòng ban</p>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                {["Software Development", "Data & AI", "Product Design"].map((d) => (
                  <div key={d} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50">
                    <span className="truncate text-slate-700">{d}</span>
                    <ChevronRight className="size-3 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* Banner Slider */}
            <div className="career-banner-slider relative min-h-[220px] rounded-xl overflow-hidden shadow-md bg-slate-900">
              <img
                src={hero.bannerImageUrl || "/acme_tech_hero.png"}
                alt="Banner"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
              <div className="relative z-10 p-5 text-white flex flex-col justify-center h-full">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                  {hero.badgeText}
                </span>
                <h3 className="text-base sm:text-lg font-bold leading-snug mb-1">{hero.title}</h3>
                <p className="text-xs text-white/80 line-clamp-2 mb-3">{hero.subtitle}</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-semibold w-fit">
                  <span>{hero.primaryCtaText || "Khám phá cơ hội"}</span>
                  <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Jobs Preview */}
        <section className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-semibold text-[var(--color-primary)] uppercase tracking-wider">
                Việc làm
              </span>
              <h3 className="text-sm font-bold text-slate-900">Việc làm nổi bật dành cho bạn</h3>
            </div>
            <span className="text-xs font-semibold text-[var(--color-primary)]">Xem tất cả →</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Senior Fullstack Engineer", location: "Hà Nội", salary: "25 - 40 triệu VND" },
              { title: "AI / Machine Learning Engineer", location: "TP. HCM", salary: "30 - 55 triệu VND" },
            ].map((j, i) => (
              <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm text-xs">
                <h4 className="font-semibold text-slate-900 mb-1">{j.title}</h4>
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <span>{j.location}</span> · <span className="text-emerald-700 font-semibold">{j.salary}</span>
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-primary)]">Xem chi tiết →</span>
              </div>
            ))}
          </div>
        </section>

        {/* Culture & About */}
        {about.enabled && (
          <section className="py-6 px-4 bg-white border-b border-slate-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              {about.badge || "Về chúng tôi"}
            </span>
            <h3 className="text-base font-bold text-slate-900 mb-2">{about.title}</h3>
            <p className="text-xs text-slate-600 mb-4">{about.description}</p>

            <div className="grid grid-cols-2 gap-2">
              {validStats.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-center">
                  <div className="text-base font-bold text-slate-900">{s.value}</div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Benefits */}
        {benefits.enabled && (
          <section className="py-6 px-4 bg-slate-50 border-b border-slate-100">
            <div className="text-center mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                {benefits.badge || "Đãi ngộ"}
              </span>
              <h3 className="text-base font-bold text-slate-900">{benefits.title}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {validBenefits.map((b, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                  <div className="font-semibold text-slate-800 mb-1">{b.title}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-2">{b.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Testimonials */}
        {testimonials.enabled && (
          <section className="py-6 px-4 bg-white border-b border-slate-100">
            <div className="text-center mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                {testimonials.badge || "Chia sẻ"}
              </span>
              <h3 className="text-base font-bold text-slate-900">{testimonials.title}</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {validTestimonials.map((t, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white text-xs">
                  <Quote className="size-4 text-[var(--color-primary)] mb-2 opacity-30" />
                  <p className="italic text-slate-700 mb-2">“{t.quote}”</p>
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="text-[10px] text-slate-500">{t.role}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="career-footer py-6 px-4 text-xs text-slate-400">
          <div className="font-bold text-white mb-2">{brandName}</div>
          <p className="text-[11px] text-slate-400 mb-4">{footer.description}</p>
          <div className="border-t border-white/10 pt-3 text-[10px] text-slate-500 flex justify-between">
            <span>{footer.copyrightText || `© 2026 ${brandName}`}</span>
            <span>{footer.bottomText}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
