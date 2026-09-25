import type { LandingPageConfig } from "../types/landing";
import {
  Search,
  ArrowRight,
  LogIn,
  Mail,
  Phone,
  Building,
  Linkedin,
  Facebook,
  Github,
  Globe,
  Sparkles,
} from "lucide-react";
import { renderIcon } from "../utils/icons";

interface LandingPreviewFrameProps {
  config: LandingPageConfig;
  brandName: string;
  viewMode: "desktop" | "mobile";
}

export function LandingPreviewFrame({ config, brandName, viewMode }: LandingPreviewFrameProps) {
  const { theme, hero, about, benefits, techStack, testimonials, footer } = config;

  const primary = theme.primaryColor || "#0058be";
  const isDarkHero = theme.darkModeHero !== false;

  const isMobile = viewMode === "mobile";

  const validStats = (about.stats || []).filter((s) => s.value?.trim() || s.label?.trim());
  const validBenefits = (benefits.items || []).filter((b) => b.title?.trim() || b.description?.trim());
  const validTags = (techStack.tags || []).filter((t) => t?.trim());
  const validTestimonials = (testimonials.items || []).filter((t) => t.name?.trim() || t.quote?.trim());

  return (
    <div
      className={`preview-canvas transition-all duration-300 bg-white shadow-xl overflow-hidden ${
        isMobile
          ? "w-[375px] mx-auto rounded-[36px] border-[8px] border-slate-900 ring-1 ring-slate-800 text-[13px]"
          : "w-full rounded-2xl border border-slate-200 text-sm"
      }`}
      style={{ fontFamily: theme.fontFamily || "inherit" }}
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
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-sm shadow-sm"
              style={{ backgroundColor: primary }}
            >
              {brandName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm tracking-tight">{brandName}</span>
              <span
                className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${primary}15`, color: primary }}
              >
                Careers
              </span>
            </div>
          </div>

          {!isMobile && (
            <div className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600">
              <span className="hover:text-slate-900 cursor-pointer">Về Chúng Tôi</span>
              <span className="hover:text-slate-900 cursor-pointer">Tech Stack</span>
              <span className="hover:text-slate-900 cursor-pointer">Việc Làm</span>
            </div>
          )}

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            style={{ backgroundColor: primary }}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
        </header>

        {/* Hero Section */}
        <section className="relative px-3 py-4">
          <div
            className={`relative overflow-hidden ${theme.borderRadius || "rounded-2xl"} shadow-md`}
            style={{
              minHeight: isMobile ? "360px" : hero.bannerHeight || "420px",
              backgroundColor: isDarkHero ? "#090d16" : "#ffffff",
            }}
          >
            {/* Background Image */}
            {hero.bannerImageUrl ? (
              <img
                src={hero.bannerImageUrl}
                alt="Banner Hero"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : (
              <div
                className="absolute inset-0 opacity-40 mix-blend-overlay"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${primary}55 0%, transparent 70%)`,
                }}
              />
            )}

            {/* Overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: isDarkHero ? "#020617" : "#f8fafc",
                opacity: (hero.overlayOpacity ?? 70) / 100,
              }}
            />

            {/* Hero Content */}
            <div
              className={`relative z-10 p-5 ${
                isMobile ? "py-8" : "p-8"
              } flex flex-col justify-center h-full max-w-2xl ${
                isDarkHero ? "text-white" : "text-slate-900"
              }`}
            >
              {hero.badgeText && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-3 self-start border"
                  style={{
                    backgroundColor: isDarkHero ? "rgba(255,255,255,0.12)" : `${primary}15`,
                    borderColor: isDarkHero ? "rgba(255,255,255,0.2)" : `${primary}30`,
                    color: isDarkHero ? "#67e8f9" : primary,
                  }}
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{hero.badgeText}</span>
                </div>
              )}

              <h1
                className={`font-extrabold tracking-tight leading-snug mb-3 ${
                  isMobile ? "text-xl" : "text-2xl sm:text-3xl"
                }`}
              >
                {hero.title}
                {hero.highlightWords && (
                  <span
                    className="block bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent mt-1"
                  >
                    {hero.highlightWords}
                  </span>
                )}
              </h1>

              <p
                className={`mb-5 leading-relaxed ${
                  isMobile ? "text-xs" : "text-xs sm:text-sm"
                } ${isDarkHero ? "text-slate-300" : "text-slate-600"}`}
              >
                {hero.subtitle}
              </p>

              {/* Search Bar */}
              {hero.showSearchBar && (
                <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl border border-white/30 shadow-lg flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-slate-400 ml-1" />
                  <input
                    type="text"
                    readOnly
                    placeholder="Tìm kiếm vị trí IT..."
                    className="bg-transparent text-xs text-slate-800 placeholder-slate-400 flex-1 outline-none font-medium"
                  />
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-white font-medium text-xs flex items-center gap-1 shadow-sm"
                    style={{ backgroundColor: primary }}
                  >
                    <span>Tìm</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-white font-semibold text-xs flex items-center gap-1.5 shadow-md"
                  style={{ backgroundColor: primary }}
                >
                  <span>{hero.primaryCtaText || "Xem vị trí tuyển dụng"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {hero.secondaryCtaText && (
                  <button
                    type="button"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                      isDarkHero
                        ? "border-white/30 text-white hover:bg-white/10"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {hero.secondaryCtaText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* About & Culture Section */}
        {about.enabled && (
          <section className="py-6 px-4 bg-white border-y border-slate-100">
            <div className="space-y-4">
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  {about.badge || "Về Chúng Tôi"}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-2 mb-1.5">
                  {about.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">{about.description}</p>
              </div>

              {about.cultureImageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm max-h-[220px]">
                  <img
                    src={about.cultureImageUrl}
                    alt="Văn hóa công ty"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Stats Grid */}
              {validStats.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {validStats.map((st, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${primary}15`, color: primary }}
                      >
                        {renderIcon(st.icon, "w-4 h-4")}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">{st.value}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{st.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Perks & Benefits Section */}
        {benefits.enabled && validBenefits.length > 0 && (
          <section className="py-6 px-4 bg-slate-50 border-b border-slate-100">
            <div className="text-center max-w-md mx-auto mb-4">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${primary}15`, color: primary }}
              >
                {benefits.badge || "Đãi Ngộ"}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1.5">
                {benefits.title}
              </h2>
              {benefits.subtitle && (
                <p className="text-xs text-slate-500 mt-1">{benefits.subtitle}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {validBenefits.map((b, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${primary}15`, color: primary }}
                  >
                    {renderIcon(b.icon, "w-4 h-4")}
                  </div>
                  <h3 className="font-bold text-xs text-slate-800 mb-1">{b.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tech Stack Section */}
        {techStack.enabled && validTags.length > 0 && (
          <section className="py-6 px-4 bg-white border-b border-slate-100">
            <div className="text-center mb-3">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${primary}15`, color: primary }}
              >
                {techStack.badge || "Công Nghệ"}
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1.5">{techStack.title}</h2>
              {techStack.subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{techStack.subtitle}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {validTags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        {testimonials.enabled && validTestimonials.length > 0 && (
          <section className="py-6 px-4 bg-slate-50 border-b border-slate-100">
            <div className="text-center mb-4">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${primary}15`, color: primary }}
              >
                {testimonials.badge || "Đội Ngũ"}
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1.5">{testimonials.title}</h2>
            </div>

            <div className="space-y-2.5">
              {validTestimonials.map((item, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm"
                >
                  <p className="text-xs text-slate-600 italic mb-2.5 leading-relaxed">
                    "{item.quote}"
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
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
                      <div className="font-bold text-xs text-slate-800">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-6 px-4 bg-slate-900 text-slate-400 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md text-white font-bold flex items-center justify-center text-xs"
                style={{ backgroundColor: primary }}
              >
                {brandName.charAt(0)}
              </div>
              <span className="font-bold text-slate-100">{brandName}</span>
            </div>

            {footer.address && (
              <div className="flex items-center gap-2 text-[11px]">
                <Building className="w-3.5 h-3.5 shrink-0" />
                <span>{footer.address}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-[11px]">
              {footer.contactEmail && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {footer.contactEmail}
                </span>
              )}
              {footer.contactPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {footer.contactPhone}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2 text-slate-300">
              {footer.linkedinUrl && <Linkedin className="w-4 h-4 cursor-pointer hover:text-white" />}
              {footer.facebookUrl && <Facebook className="w-4 h-4 cursor-pointer hover:text-white" />}
              {footer.githubUrl && <Github className="w-4 h-4 cursor-pointer hover:text-white" />}
              {footer.websiteUrl && <Globe className="w-4 h-4 cursor-pointer hover:text-white" />}
            </div>

            <div className="border-t border-slate-800 pt-3 text-[10px] text-slate-500">
              {footer.copyrightText || "SmartHire-AI Enterprise. Bảo lưu mọi quyền."}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
