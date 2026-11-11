import type { PublicJob } from "@/api/types/job";
import type { LandingPageConfig } from "@/features/tenant/admin/landing/types/landing";
import { stripTextExcerpt, toAbsoluteUrl, type SeoConfig } from "@/lib/seo";

function breadcrumbSchema(origin: string, items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  };
}

function buildMasterHomeJsonLd(origin: string): Array<Record<string, unknown>> {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "SmartHire AI",
      url: origin,
      logo: `${origin}/logo-smarthire-icon.png`,
      email: "contact@smarthire.top",
      description:
        "Nền tảng tuyển dụng AI Enterprise giúp doanh nghiệp tự động hóa sàng lọc CV, đánh giá kỹ thuật bằng Docker Sandbox và phỏng vấn giọng nói AI 24/7.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "SmartHire AI",
      url: origin,
      inLanguage: "vi-VN",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "SmartHire AI",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: origin,
      offers: {
        "@type": "Offer",
        priceCurrency: "VND",
        availability: "https://schema.org/InStock",
        url: `${origin}/pricing`,
      },
      description:
        "Nền tảng tuyển dụng SaaS Multi-Tenant tích hợp AI: sàng lọc hồ sơ tự động, thi lập trình trong Sandbox cô lập và phỏng vấn giọng nói AI.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Hệ thống có bảo vệ và cách ly dữ liệu tuyển dụng giữa các công ty không?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tuyệt đối an toàn. Mỗi doanh nghiệp được cấp phát một môi trường dữ liệu và không gian làm việc hoàn toàn tách biệt theo kiến trúc Separate Database per Tenant.",
          },
        },
        {
          "@type": "Question",
          name: "Thời gian triển khai giải pháp cho một doanh nghiệp mất bao lâu?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Với các gói tiêu chuẩn, không gian làm việc số hóa của doanh nghiệp được cấu hình và bàn giao tự động trong vòng 24 giờ; các gói tích hợp SSO hoặc máy chủ nội bộ triển khai từ 3 đến 5 ngày làm việc.",
          },
        },
        {
          "@type": "Question",
          name: "Trợ lý AI phỏng vấn giọng nói có gây khó khăn cho ứng viên không?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ứng viên có thể trả lời bằng micro trên điện thoại hoặc máy tính 24/7 với trải nghiệm đàm thoại 2 chiều tự nhiên và xuất báo cáo khách quan.",
          },
        },
        {
          "@type": "Question",
          name: "Doanh nghiệp có thể tùy chỉnh bài thi kỹ thuật và tiêu chí chấm điểm theo yêu cầu riêng không?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hoàn toàn có thể. Doanh nghiệp có thể dùng ngân hàng đề thi chuẩn hóa của SmartHire-AI hoặc tự tạo đề trắc nghiệm, bài test lập trình và thiết lập trọng số ưu tiên theo từng phòng ban.",
          },
        },
      ],
    },
  ];
}

/**
 * Resolves static/route-level SEO configuration for Master marketing,
 * Tenant utility, and private/auth routes. Returns null for Tenant career routes
 * whose metadata depends on fetched landing/job data.
 */
export function resolveRouteSeo(
  pathname: string,
  tenantId: string | null,
  origin: string,
): SeoConfig | null {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");

  if (tenantId) {
    if (path === "/" || path === "/career" || path === "/jobs" || path.startsWith("/jobs/")) {
      return null;
    }
    if (path === "/cv-templates") {
      return {
        title: "Thư viện mẫu CV IT chuẩn nhà tuyển dụng | SmartHire AI",
        description:
          "Chọn mẫu CV IT theo phong cách và vị trí Backend, Frontend, Fullstack, DevOps, AI. Tối ưu bố cục để nhà tuyển dụng nắm bắt thông tin nhanh nhất.",
        canonicalUrl: `${origin}/cv-templates`,
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Mẫu CV", path: "/cv-templates" },
        ]),
      };
    }
    if (path === "/cv-guide") {
      return {
        title: "Hướng dẫn viết CV IT gây ấn tượng ngay lần đọc đầu | SmartHire AI",
        description:
          "Cẩm nang viết CV IT chuẩn công thức X-Y-Z, cấu trúc CV kỹ sư phần mềm, lỗi thường gặp và checklist trước khi ứng tuyển.",
        canonicalUrl: `${origin}/cv-guide`,
        ogType: "article",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Hướng dẫn viết CV IT gây ấn tượng ngay lần đọc đầu",
            inLanguage: "vi-VN",
            mainEntityOfPage: `${origin}/cv-guide`,
          },
          breadcrumbSchema(origin, [
            { name: "Trang chủ", path: "/" },
            { name: "Hướng dẫn viết CV", path: "/cv-guide" },
          ]),
        ],
      };
    }
    if (path === "/assessments/sample") {
      return {
        title: "Bài thi đánh giá kỹ thuật IT mẫu | SmartHire AI",
        description:
          "Trải nghiệm bài thi đánh giá kỹ thuật trắc nghiệm, tự luận và lập trình trực tiếp trên trình duyệt trước khi ứng tuyển.",
        canonicalUrl: `${origin}/assessments/sample`,
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Bài test mẫu", path: "/assessments/sample" },
        ]),
      };
    }

    return resolvePrivateAppSeo(path);
  }

  // Master SaaS domain routes
  switch (path) {
    case "/":
      return {
        title: "SmartHire AI — Nền Tảng Tuyển Dụng AI Cho Doanh Nghiệp",
        description:
          "Giải pháp tuyển dụng AI toàn diện cho doanh nghiệp: sàng lọc CV thông minh, đánh giá năng lực kỹ thuật với Docker Sandbox và phỏng vấn giọng nói AI 24/7. Rút ngắn 70% thời gian tuyển dụng.",
        canonicalUrl: `${origin}/`,
        jsonLd: buildMasterHomeJsonLd(origin),
      };
    case "/solutions":
      return {
        title: "Giải Pháp Tuyển Dụng AI Toàn Diện | SmartHire AI",
        description:
          "Khám phá bộ 5 giải pháp AI của SmartHire: Bóc tách & đối khớp CV thông minh, Sandbox đánh giá lập trình tự động, Trợ lý phỏng vấn giọng nói AI 24/7 và xếp hạng ứng viên đa chiều.",
        canonicalUrl: `${origin}/solutions`,
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Giải pháp AI", path: "/solutions" },
        ]),
      };
    case "/preview":
      return {
        title: "Trải Nghiệm Thực Tế Nền Tảng Tuyển Dụng AI | SmartHire AI",
        description:
          "Thao tác trực tiếp với quy trình lọc CV thông minh, chấm code tự động trong Docker Sandbox và phỏng vấn giọng nói AI theo thời gian thực.",
        canonicalUrl: `${origin}/preview`,
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Trải nghiệm thực tế", path: "/preview" },
        ]),
      };
    case "/roi":
    case "/value":
      return {
        title: "Hiệu Quả Đầu Tư & ROI Tuyển Dụng AI | SmartHire AI",
        description:
          "Giảm 70% thời gian lọc hồ sơ, tăng tốc độ tuyển dụng 3.5x và tiết kiệm 45% chi phí tuyển dụng cho CHRO, Recruiter và Tech Lead.",
        canonicalUrl: `${origin}/roi`,
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Hiệu quả & ROI", path: "/roi" },
        ]),
      };
    case "/security":
      return {
        title: "Bảo Mật Dữ Liệu Doanh Nghiệp & Separate DB | SmartHire AI",
        description:
          "Kiến trúc Separate Database per Tenant cô lập dữ liệu tuyệt đối, mã hóa AES-256 & TLS 1.3, SSO doanh nghiệp và tuân thủ Luật Bảo vệ dữ liệu cá nhân 2025.",
        canonicalUrl: `${origin}/security`,
        ogImage: "/security_showcase.jpg",
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Bảo mật dữ liệu", path: "/security" },
        ]),
      };
    case "/pricing":
    case "/packages":
      return {
        title: "Bảng Giá & Gói Giải Pháp Doanh Nghiệp | SmartHire AI",
        description:
          "So sánh chi tiết các gói Starter, Professional và Enterprise của SmartHire AI với hạn mức CV, Docker Sandbox và phỏng vấn giọng nói AI.",
        canonicalUrl: `${origin}/pricing`,
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Gói giải pháp", path: "/pricing" },
        ]),
      };
    case "/demo":
      return {
        title: "Đăng Ký Tư Vấn & Demo 1:1 | SmartHire AI",
        description:
          "Đặt lịch demo 1:1 cùng chuyên gia giải pháp SmartHire AI để trải nghiệm quy trình sàng lọc CV, đánh giá kỹ thuật và phỏng vấn AI cho doanh nghiệp của bạn.",
        canonicalUrl: `${origin}/demo`,
        jsonLd: breadcrumbSchema(origin, [
          { name: "Trang chủ", path: "/" },
          { name: "Yêu cầu Demo", path: "/demo" },
        ]),
      };
    case "/terms":
      return {
        title: "Điều Khoản Sử Dụng Dịch Vụ | SmartHire AI",
        description:
          "Điều khoản sử dụng và thỏa thuận cung cấp dịch vụ nền tảng tuyển dụng SmartHire AI dành cho khách hàng doanh nghiệp.",
        canonicalUrl: `${origin}/terms`,
      };
    case "/privacy":
      return {
        title: "Chính Sách Bảo Vệ Dữ Liệu Cá Nhân | SmartHire AI",
        description:
          "Chính sách bảo mật và bảo vệ dữ liệu cá nhân của SmartHire AI theo Nghị định bảo vệ dữ liệu cá nhân.",
        canonicalUrl: `${origin}/privacy`,
      };
    default:
      return resolvePrivateAppSeo(path);
  }
}

function resolvePrivateAppSeo(path: string): SeoConfig {
  let title = "SmartHire AI";
  if (path === "/login" || path === "/candidate/login") title = "Đăng nhập ứng viên | SmartHire AI";
  else if (path === "/internal/login" || path === "/admin/login") title = "Đăng nhập hệ thống | SmartHire AI";
  else if (path === "/register") title = "Đăng ký tài khoản ứng viên | SmartHire AI";
  else if (path.startsWith("/checkout")) title = "Thanh toán gói giải pháp | SmartHire AI";
  else if (path.startsWith("/onboard")) title = "Khởi tạo Workspace doanh nghiệp | SmartHire AI";
  else if (path.startsWith("/admin")) title = "Quản trị nền tảng | SmartHire AI";
  else if (path.startsWith("/recruiter")) title = "Không gian nhà tuyển dụng | SmartHire AI";
  else if (path.startsWith("/internal/admin") || path.startsWith("/tenant/admin")) {
    title = "Quản trị doanh nghiệp | SmartHire AI";
  } else if (path.startsWith("/cv/share")) title = "Hồ sơ CV được chia sẻ | SmartHire AI";
  else if (path.startsWith("/cv")) title = "Quản lý CV của tôi | SmartHire AI";
  else if (path.startsWith("/applications")) title = "Đơn ứng tuyển của tôi | SmartHire AI";
  else if (path.startsWith("/assessments")) title = "Đánh giá năng lực | SmartHire AI";
  else if (path.startsWith("/interviews") || path.startsWith("/meet")) title = "Phỏng vấn | SmartHire AI";
  else if (path.startsWith("/contracts")) title = "Ký kết hợp đồng điện tử | SmartHire AI";
  else if (path.startsWith("/invite")) title = "Kích hoạt tài khoản | SmartHire AI";

  return {
    title,
    robots: "noindex, nofollow",
  };
}

function mapSchemaEmploymentType(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const upper = raw.trim().toUpperCase();
  const mapping: Record<string, string> = {
    FULL_TIME: "FULL_TIME",
    FULLTIME: "FULL_TIME",
    PART_TIME: "PART_TIME",
    PARTTIME: "PART_TIME",
    CONTRACT: "CONTRACTOR",
    CONTRACTOR: "CONTRACTOR",
    INTERN: "INTERN",
    INTERNSHIP: "INTERN",
    TEMPORARY: "TEMPORARY",
    FREELANCE: "TEMPORARY",
  };
  return mapping[upper] ?? "OTHER";
}

export function buildTenantCareerSeo(options: {
  origin: string;
  tenantName: string;
  isJobsPage: boolean;
  isJobDetailPage: boolean;
  job?: PublicJob | null;
  jobNotFound?: boolean;
  customLanding?: LandingPageConfig | null;
  detailLocation?: string | null;
}): SeoConfig {
  const { origin, tenantName, isJobsPage, isJobDetailPage, job, jobNotFound, customLanding, detailLocation } = options;
  const siteLogo = customLanding?.header?.logoImageUrl
    ? toAbsoluteUrl(customLanding.header.logoImageUrl, origin)
    : `${origin}/logo-smarthire-icon.png`;
  const defaultOgImage =
    customLanding?.seo?.ogImageUrl ||
    customLanding?.hero?.bannerImageUrl ||
    "/acme_tech_hero.png";

  if (isJobDetailPage) {
    if (jobNotFound) {
      return {
        title: `Không tìm thấy vị trí tuyển dụng | ${tenantName}`,
        robots: "noindex, nofollow",
      };
    }
    if (!job) {
      return {
        title: `Chi tiết vị trí tuyển dụng | ${tenantName}`,
        canonicalUrl: `${origin}${window.location.pathname}`,
      };
    }

    const descriptionParts = [
      detailLocation ? `Địa điểm: ${detailLocation}.` : null,
      job.salary ? `Mức lương: ${job.salary}.` : null,
      stripTextExcerpt(job.description, 120),
    ].filter(Boolean);
    const description = descriptionParts.join(" ") || `Ứng tuyển vị trí ${job.title} tại ${tenantName}.`;
    const canonicalUrl = `${origin}/jobs/${job.id}`;

    const fullDescription = [
      job.description,
      job.responsibilities ? `Trách nhiệm và yêu cầu:\n${job.responsibilities}` : null,
      job.benefits ? `Quyền lợi:\n${job.benefits}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const jobPosting: Record<string, unknown> = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: job.title,
      description: fullDescription,
      url: canonicalUrl,
      hiringOrganization: {
        "@type": "Organization",
        name: tenantName,
        sameAs: customLanding?.footer?.websiteUrl || origin,
        logo: siteLogo,
      },
      directApply: job.acceptingApplications,
    };

    if (job.publishedAt) jobPosting.datePosted = job.publishedAt;
    if (job.deadline) jobPosting.validThrough = job.deadline;
    const empType = mapSchemaEmploymentType(job.employmentType);
    if (empType) jobPosting.employmentType = empType;

    if (detailLocation) {
      jobPosting.jobLocation = {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: detailLocation,
          addressCountry: "VN",
        },
      };
    }
    if (job.workMode?.toUpperCase() === "REMOTE") {
      jobPosting.jobLocationType = "TELECOMMUTE";
      jobPosting.applicantLocationRequirements = { "@type": "Country", name: "VN" };
    }
    if (job.salaryMin != null || job.salaryMax != null) {
      jobPosting.baseSalary = {
        "@type": "MonetaryAmount",
        currency: job.salaryCurrency || "VND",
        value: {
          "@type": "QuantitativeValue",
          ...(job.salaryMin != null ? { minValue: job.salaryMin } : {}),
          ...(job.salaryMax != null ? { maxValue: job.salaryMax } : {}),
          unitText: "MONTH",
        },
      };
    }
    if (job.skills.length > 0) {
      jobPosting.skills = job.skills.join(", ");
    }

    return {
      title: `${job.title} — Tuyển dụng tại ${tenantName}`,
      description,
      canonicalUrl,
      ogType: "article",
      ogSiteName: tenantName,
      ogImage: defaultOgImage,
      jsonLd: [
        jobPosting,
        breadcrumbSchema(origin, [
          { name: tenantName, path: "/" },
          { name: "Việc làm", path: "/jobs" },
          { name: job.title, path: `/jobs/${job.id}` },
        ]),
      ],
    };
  }

  if (isJobsPage) {
    return {
      title: `Việc làm đang tuyển tại ${tenantName} | Tuyển dụng ${tenantName}`,
      description: `Khám phá các vị trí việc làm đang mở tại ${tenantName}. Nộp CV nhanh chóng và theo dõi trạng thái ứng tuyển trực tuyến.`,
      canonicalUrl: `${origin}/jobs`,
      ogSiteName: tenantName,
      ogImage: defaultOgImage,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Danh sách việc làm tại ${tenantName}`,
          url: `${origin}/jobs`,
        },
        breadcrumbSchema(origin, [
          { name: tenantName, path: "/" },
          { name: "Việc làm", path: "/jobs" },
        ]),
      ],
    };
  }

  const sameAs = [
    customLanding?.footer?.websiteUrl,
    customLanding?.footer?.linkedinUrl,
    customLanding?.footer?.facebookUrl,
    customLanding?.footer?.githubUrl,
  ].filter((url): url is string => Boolean(url?.trim()));

  const title =
    customLanding?.seo?.metaTitle?.trim() || `${tenantName} — Cơ Hội Nghề Nghiệp & Tuyển Dụng`;
  const description =
    customLanding?.seo?.metaDescription?.trim() ||
    stripTextExcerpt(customLanding?.about?.description || customLanding?.hero?.subtitle, 158) ||
    `Khám phá cơ hội nghề nghiệp và các vị trí đang tuyển dụng tại ${tenantName}.`;

  return {
    title,
    description,
    canonicalUrl: `${origin}/`,
    ogSiteName: tenantName,
    ogImage: defaultOgImage,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: tenantName,
        url: origin,
        logo: siteLogo,
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: `${tenantName} Careers`,
        url: origin,
        potentialAction: {
          "@type": "SearchAction",
          target: `${origin}/jobs?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

