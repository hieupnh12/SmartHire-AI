import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { landingApi } from "@/api/tenant/landingApi";
import type { LandingPageConfig } from "../types/landing";
import { Button } from "@/components/ux/Button";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { toast } from "@/stores/toastStore";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import {
  Menu,
  ArrowLeft,
  Eye,
  EyeOff,
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rawTenantCode = getTenantIdFromWindow() || "acme";

  // UI Builder States
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showVisualControls, setShowVisualControls] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("hero");
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isViewModeMenuOpen, setIsViewModeMenuOpen] = useState(false);
  const [config, setConfig] = useState<LandingPageConfig | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [inlineNewTag, setInlineNewTag] = useState<string>("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tenant-landing-page"],
    queryFn: landingApi.getAdminLandingPage,
  });

  useEffect(() => {
    if (data?.data?.config) {
      const c = data.data.config;
      const brand = rawTenantCode.toUpperCase();
      const enrichedConfig: LandingPageConfig = {
        ...c,
        hero: {
          ...c.hero,
          bannerImageUrl: c.hero?.bannerImageUrl || "/acme_tech_hero.png",
          bannerHeight: c.hero?.bannerHeight || "540px",
          title: c.hero?.title || `Chinh Phục Tương Lai Công Nghệ Cùng ${brand}`,
          badgeText: c.hero?.badgeText || "Dẫn đầu Giải pháp Công nghệ Enterprise Multi-Tenant & AI",
          highlightWords: c.hero?.highlightWords || brand,
          subtitle:
            c.hero?.subtitle ||
            "Gia nhập đội ngũ kỹ sư tài năng tại môi trường làm việc chuẩn quốc tế. Cùng chúng tôi kiến tạo các sản phẩm công nghệ đột phá và khai phóng tối đa tiềm năng của bạn.",
        },
        about: {
          ...c.about,
          cultureImageUrl: c.about?.cultureImageUrl || "/acme_culture.png",
          badge: c.about?.badge || "Về Chúng Tôi",
          title: c.about?.title || `Vì Sao Bạn Nên Chọn ${brand}?`,
          description:
            c.about?.description ||
            `Tại ${brand}, chúng tôi tin rằng con người là tài sản quý giá nhất. Đội ngũ Kỹ sư làm việc trong môi trường cởi mở, áp dụng quy trình Agile/Scrum tiêu chuẩn toàn cầu, liên tục tiếp cận các bài toán Enterprise thách thức.`,
          stats:
            c.about?.stats && c.about.stats.length > 0
              ? c.about.stats
              : [
                  { icon: "Users", value: "500+", label: "Kỹ Sư Phần Mềm & AI" },
                  { icon: "Zap", value: "99.99%", label: "SLA Enterprise High Availability" },
                  { icon: "Award", value: "100%", label: "Tài Trợ Chứng Chỉ AWS/GCP" },
                  { icon: "Globe", value: "Global", label: "Dự Án Enterprise Quốc Tế" },
                ],
        },
        benefits: {
          ...c.benefits,
          enabled: c.benefits?.enabled ?? true,
          badge: c.benefits?.badge || "Đãi Ngộ",
          title: c.benefits?.title || "Chế Độ Đãi Ngộ & Phúc Lợi Toàn Diện",
          subtitle:
            c.benefits?.subtitle ||
            "Chúng tôi chăm sóc toàn diện cho sức khỏe, sự nghiệp và đời sống tinh thần của bạn",
          items:
            c.benefits?.items && c.benefits.items.length > 0
              ? c.benefits.items
              : [
                  {
                    icon: "HeartHandshake",
                    title: "Chăm Sóc Sức Khỏe Toàn Diện",
                    description:
                      "Bảo hiểm sức khỏe cao cấp cho nhân viên và người thân, khám sức khỏe định kỳ hàng năm.",
                  },
                  {
                    icon: "Laptop",
                    title: "Thiết Bị Làm Việc Hiện Đại",
                    description:
                      "Trang bị Macbook Pro / Laptop cấu hình cao cùng màn hình 4K và trợ cấp setup góc làm việc.",
                  },
                  {
                    icon: "TrendingUp",
                    title: "Đào Tạo & Phát Triển Chuyên Sâu",
                    description:
                      "Ngân sách học tập cá nhân, hỗ trợ thi chứng chỉ quốc tế và các buổi tech-talk chia sẻ nội bộ.",
                  },
                  {
                    icon: "Coffee",
                    title: "Cân Bằng Cuộc Sống & Thưởng Hiệu Suất",
                    description:
                      "Lương tháng 13, thưởng dự án, ngày nghỉ phép linh hoạt và tiệc teambuilding định kỳ.",
                  },
                ],
        },
        techStack: {
          ...c.techStack,
          enabled: c.techStack?.enabled ?? true,
          badge: c.techStack?.badge || "Tech Stack",
          title: c.techStack?.title || "Hệ Sinh Thái Công Nghệ & Kỹ Năng",
          subtitle:
            c.techStack?.subtitle ||
            "Ứng dụng các công nghệ hiện đại và kiến trúc vi dịch vụ mở rộng cao",
          tags:
            c.techStack?.tags && c.techStack.tags.length > 0
              ? c.techStack.tags
              : [
                  "Java 21",
                  "Spring Boot",
                  "React",
                  "TypeScript",
                  "Docker",
                  "Kubernetes",
                  "Redis",
                  "RabbitMQ",
                  "MySQL",
                  "AI / Machine Learning",
                ],
        },
        testimonials: {
          ...c.testimonials,
          enabled: c.testimonials?.enabled ?? true,
          badge: c.testimonials?.badge || "Đội Ngũ",
          title: c.testimonials?.title || "Cảm Nhận Từ Các Kỹ Sư Thành Viên",
          items:
            c.testimonials?.items && c.testimonials.items.length > 0
              ? c.testimonials.items
              : [
                  {
                    name: "Minh Quân",
                    role: "Senior Software Engineer",
                    avatarUrl: "",
                    quote: `Môi trường tại ${brand} mang lại cho tôi cơ hội làm việc với các hệ thống phân tán lớn và học hỏi liên tục từ các đồng nghiệp tài năng.`,
                  },
                  {
                    name: "Thu Hà",
                    role: "Tech Lead / Architect",
                    avatarUrl: "",
                    quote:
                      "Văn hóa trao quyền và tôn trọng ý tưởng mới là điều tôi yêu thích nhất ở đây. Bạn luôn có không gian để tạo ra đột phá và nâng tầm giải pháp.",
                  },
                ],
        },
      };
      setConfig(enrichedConfig);
    }
  }, [data, rawTenantCode]);

  const updateMutation = useMutation({
    mutationFn: landingApi.updateLandingPage,
    onSuccess: (res) => {
      queryClient.setQueryData(["tenant-landing-page"], res);
      queryClient.invalidateQueries({ queryKey: ["public-landing"] });
      toast.success(res.data?.published ? "Đã xuất bản Landing Page thành công!" : "Đã lưu bản nháp thành công!");
    },
    onError: (err) => {
      toast.danger(getApiErrorMessage(err, "Không thể lưu cấu hình Landing Page"));
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
      toast.success("Đã khôi phục Landing Page về mẫu chuẩn ban đầu!");
    },
    onError: (err) => {
      toast.danger(getApiErrorMessage(err, "Không thể khôi phục mặc định"));
    },
  });

  if (isLoading || !config) {
    return <PageSkeleton />;
  }

  if (isError) {
    return (
      <section className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Landing Page</h1>
        <p className="text-red-600">{getApiErrorMessage(error, "Không thể tải cấu hình Landing Page")}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Thử lại
        </Button>
      </section>
    );
  }

  // --- Handlers for Deep Nested Updates ---
  const updateTheme = (patch: Partial<LandingPageConfig["theme"]>) => setConfig((prev) => (prev ? { ...prev, theme: { ...prev.theme, ...patch } } : prev));
  const updateHero = (patch: Partial<LandingPageConfig["hero"]>) => setConfig((prev) => (prev ? { ...prev, hero: { ...prev.hero, ...patch } } : prev));
  const updateAbout = (patch: Partial<LandingPageConfig["about"]>) => setConfig((prev) => (prev ? { ...prev, about: { ...prev.about, ...patch } } : prev));
  const updateBenefits = (patch: Partial<LandingPageConfig["benefits"]>) => setConfig((prev) => (prev ? { ...prev, benefits: { ...prev.benefits, ...patch } } : prev));
  const updateTechStack = (patch: Partial<LandingPageConfig["techStack"]>) => setConfig((prev) => (prev ? { ...prev, techStack: { ...prev.techStack, ...patch } } : prev));
  const updateTestimonials = (patch: Partial<LandingPageConfig["testimonials"]>) => setConfig((prev) => (prev ? { ...prev, testimonials: { ...prev.testimonials, ...patch } } : prev));
  const updateFooter = (patch: Partial<LandingPageConfig["footer"]>) => setConfig((prev) => (prev ? { ...prev, footer: { ...prev.footer, ...patch } } : prev));
  const updateSeo = (patch: Partial<LandingPageConfig["seo"]>) => setConfig((prev) => (prev ? { ...prev, seo: { ...prev.seo, ...patch } } : prev));

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await landingApi.uploadImage(file);
      if (res.data?.url) {
        onUploaded(res.data.url);
        toast.success("Tải ảnh lên thành công!");
      }
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Tải ảnh thất bại"));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = (publish: boolean) => {
    if (!config) return;
    updateMutation.mutate({ config, publish });
  };

  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục về giao diện mặc định ban đầu không? Toàn bộ tùy biến hiện tại sẽ được làm mới.")) {
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
    if (!config.techStack.tags.includes(tag)) {
      updateTechStack({ tags: [...config.techStack.tags, tag] });
    }
    setInlineNewTag("");
  };

  const primary = config.theme.primaryColor || "#0058be";
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
            title={isDrawerOpen ? "Đóng Cài Đặt" : "Tùy Biến"}
          >
            <Menu className="w-4 h-4 text-cyan-600" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/internal/admin")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Về Admin</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 tracking-tight">{brandName}</span>
            <span className="hidden lg:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
              Trình Chỉnh Sửa Trực Quan
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                data?.data?.published
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {data?.data?.published ? "Đã Xuất Bản" : "Bản Nháp"}
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
                Select device preview
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
                    <span className="text-xs whitespace-nowrap">Current screen size</span>
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
                    <span>Mobile</span>
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
                    <span>Tablet</span>
                  </div>
                  {viewMode === "tablet" && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                </button>
              </div>

            <div className="text-slate-300 pointer-events-none mx-1 text-lg font-light">/</div>

            <button
              type="button"
              onClick={() => {
                // Refresh iframe or trigger a visual reload logic if needed
                // Currently just re-triggers re-render by doing nothing or refetching
                refetch();
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900 relative group"
            >
              <RotateCcw className="w-4 h-4" />
              
              {/* Custom Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs rounded-full whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[120]">
                Tải lại
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
                Toàn màn hình
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
            <span>{showVisualControls ? "Nút Sửa: Bật" : "Nút Sửa: Tắt"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.open("/career", "_blank")}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở Trang Thật</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Khôi Phục</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Nháp</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md transition-all hover:opacity-95"
            style={{ backgroundColor: primary }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Xuất Bản Ngay</span>
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
          config={config}
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
          config={config}
          brandName={brandName}
          viewMode={viewMode}
          showVisualControls={showVisualControls}
          openDrawerTab={openDrawerTab}
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
