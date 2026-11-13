import type { PublicJob } from "@/api/types/job";
import type { LandingPageConfig } from "@/features/tenant/admin/landing/types/landing";
import { t, toIntlLocale, useI18nStore } from "@/i18n";
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
  const inLanguage = toIntlLocale(useI18nStore.getState().locale);
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: t("seo.siteName"),
      url: origin,
      logo: `${origin}/logo-smarthire-icon.png`,
      email: "contact@smarthire.top",
      description: t("seo.master.orgDescription"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: t("seo.siteName"),
      url: origin,
      inLanguage,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: t("seo.siteName"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: origin,
      offers: {
        "@type": "Offer",
        priceCurrency: "VND",
        availability: "https://schema.org/InStock",
        url: `${origin}/pricing`,
      },
      description: t("seo.master.softwareDescription"),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: t("seo.master.faq1Q"),
          acceptedAnswer: {
            "@type": "Answer",
            text: t("seo.master.faq1A"),
          },
        },
        {
          "@type": "Question",
          name: t("seo.master.faq2Q"),
          acceptedAnswer: {
            "@type": "Answer",
            text: t("seo.master.faq2A"),
          },
        },
        {
          "@type": "Question",
          name: t("seo.master.faq3Q"),
          acceptedAnswer: {
            "@type": "Answer",
            text: t("seo.master.faq3A"),
          },
        },
        {
          "@type": "Question",
          name: t("seo.master.faq4Q"),
          acceptedAnswer: {
            "@type": "Answer",
            text: t("seo.master.faq4A"),
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
  const homeName = t("seo.homeBreadcrumb");
  const inLanguage = toIntlLocale(useI18nStore.getState().locale);

  if (tenantId) {
    if (path === "/" || path === "/career" || path === "/jobs" || path.startsWith("/jobs/")) {
      return null;
    }
    if (path === "/cv-templates") {
      return {
        title: t("seo.tenantPublic.cvTemplatesTitle"),
        description: t("seo.tenantPublic.cvTemplatesDescription"),
        canonicalUrl: `${origin}/cv-templates`,
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.tenantPublic.cvTemplatesBreadcrumb"), path: "/cv-templates" },
        ]),
      };
    }
    if (path === "/cv-guide") {
      return {
        title: t("seo.tenantPublic.cvGuideTitle"),
        description: t("seo.tenantPublic.cvGuideDescription"),
        canonicalUrl: `${origin}/cv-guide`,
        ogType: "article",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: t("seo.tenantPublic.cvGuideHeadline"),
            inLanguage,
            mainEntityOfPage: `${origin}/cv-guide`,
          },
          breadcrumbSchema(origin, [
            { name: homeName, path: "/" },
            { name: t("seo.tenantPublic.cvGuideBreadcrumb"), path: "/cv-guide" },
          ]),
        ],
      };
    }
    if (path === "/assessments/sample") {
      return {
        title: t("seo.tenantPublic.sampleTestTitle"),
        description: t("seo.tenantPublic.sampleTestDescription"),
        canonicalUrl: `${origin}/assessments/sample`,
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.tenantPublic.sampleTestBreadcrumb"), path: "/assessments/sample" },
        ]),
      };
    }

    return resolvePrivateAppSeo(path);
  }

  // Master SaaS domain routes
  switch (path) {
    case "/":
      return {
        title: t("seo.master.homeTitle"),
        description: t("seo.master.homeDescription"),
        canonicalUrl: `${origin}/`,
        jsonLd: buildMasterHomeJsonLd(origin),
      };
    case "/solutions":
      return {
        title: t("seo.master.solutionsTitle"),
        description: t("seo.master.solutionsDescription"),
        canonicalUrl: `${origin}/solutions`,
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.master.solutionsBreadcrumb"), path: "/solutions" },
        ]),
      };
    case "/preview":
      return {
        title: t("seo.master.previewTitle"),
        description: t("seo.master.previewDescription"),
        canonicalUrl: `${origin}/preview`,
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.master.previewBreadcrumb"), path: "/preview" },
        ]),
      };
    case "/roi":
    case "/value":
      return {
        title: t("seo.master.roiTitle"),
        description: t("seo.master.roiDescription"),
        canonicalUrl: `${origin}/roi`,
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.master.roiBreadcrumb"), path: "/roi" },
        ]),
      };
    case "/security":
      return {
        title: t("seo.master.securityTitle"),
        description: t("seo.master.securityDescription"),
        canonicalUrl: `${origin}/security`,
        ogImage: "/security_showcase.jpg",
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.master.securityBreadcrumb"), path: "/security" },
        ]),
      };
    case "/pricing":
    case "/packages":
      return {
        title: t("seo.master.pricingTitle"),
        description: t("seo.master.pricingDescription"),
        canonicalUrl: `${origin}/pricing`,
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.master.pricingBreadcrumb"), path: "/pricing" },
        ]),
      };
    case "/demo":
      return {
        title: t("seo.master.demoTitle"),
        description: t("seo.master.demoDescription"),
        canonicalUrl: `${origin}/demo`,
        jsonLd: breadcrumbSchema(origin, [
          { name: homeName, path: "/" },
          { name: t("seo.master.demoBreadcrumb"), path: "/demo" },
        ]),
      };
    case "/terms":
      return {
        title: t("seo.master.termsTitle"),
        description: t("seo.master.termsDescription"),
        canonicalUrl: `${origin}/terms`,
      };
    case "/privacy":
      return {
        title: t("seo.master.privacyTitle"),
        description: t("seo.master.privacyDescription"),
        canonicalUrl: `${origin}/privacy`,
      };
    default:
      return resolvePrivateAppSeo(path);
  }
}

function resolvePrivateAppSeo(path: string): SeoConfig {
  let title = t("seo.siteName");
  if (path === "/login" || path === "/candidate/login") title = t("seo.privateApp.candidateLoginTitle");
  else if (path === "/internal/login" || path === "/admin/login") title = t("seo.privateApp.systemLoginTitle");
  else if (path === "/register") title = t("seo.privateApp.registerTitle");
  else if (path.startsWith("/checkout")) title = t("seo.privateApp.checkoutTitle");
  else if (path.startsWith("/onboard")) title = t("seo.privateApp.onboardTitle");
  else if (path.startsWith("/admin")) title = t("seo.privateApp.adminTitle");
  else if (path.startsWith("/recruiter")) title = t("seo.privateApp.recruiterTitle");
  else if (path.startsWith("/internal/admin") || path.startsWith("/tenant/admin")) {
    title = t("seo.privateApp.tenantAdminTitle");
  } else if (path.startsWith("/cv/share")) title = t("seo.privateApp.cvShareTitle");
  else if (path.startsWith("/cv")) title = t("seo.privateApp.cvTitle");
  else if (path.startsWith("/applications")) title = t("seo.privateApp.applicationsTitle");
  else if (path.startsWith("/assessments")) title = t("seo.privateApp.assessmentsTitle");
  else if (path.startsWith("/interviews") || path.startsWith("/meet")) title = t("seo.privateApp.interviewsTitle");
  else if (path.startsWith("/contracts")) title = t("seo.privateApp.contractsTitle");
  else if (path.startsWith("/invite")) title = t("seo.privateApp.inviteTitle");

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
        title: t("seo.career.jobNotFoundTitle", { tenantName }),
        robots: "noindex, nofollow",
      };
    }
    if (!job) {
      return {
        title: t("seo.career.jobDetailFallbackTitle", { tenantName }),
        canonicalUrl: `${origin}${window.location.pathname}`,
      };
    }

    const descriptionParts = [
      detailLocation ? t("seo.career.locationLine", { location: detailLocation }) : null,
      job.salary ? t("seo.career.salaryLine", { salary: job.salary }) : null,
      stripTextExcerpt(job.description, 120),
    ].filter(Boolean);
    const description = descriptionParts.join(" ") || t("seo.career.applyPrompt", { jobTitle: job.title, tenantName });
    const canonicalUrl = `${origin}/jobs/${job.id}`;

    const fullDescription = [
      job.description,
      job.responsibilities ? t("seo.career.responsibilitiesLabel", { content: job.responsibilities }) : null,
      job.benefits ? t("seo.career.benefitsLabel", { content: job.benefits }) : null,
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
      jobPosting.applicantLocationRequirements = { "@type": "Country", name: t("seo.countryName") };
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
      title: t("seo.career.jobTitlePattern", { jobTitle: job.title, tenantName }),
      description,
      canonicalUrl,
      ogType: "article",
      ogSiteName: tenantName,
      ogImage: defaultOgImage,
      jsonLd: [
        jobPosting,
        breadcrumbSchema(origin, [
          { name: tenantName, path: "/" },
          { name: t("seo.jobsBreadcrumb"), path: "/jobs" },
          { name: job.title, path: `/jobs/${job.id}` },
        ]),
      ],
    };
  }

  if (isJobsPage) {
    return {
      title: t("seo.career.jobsTitle", { tenantName }),
      description: t("seo.career.jobsDescription", { tenantName }),
      canonicalUrl: `${origin}/jobs`,
      ogSiteName: tenantName,
      ogImage: defaultOgImage,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("seo.career.jobsCollectionName", { tenantName }),
          url: `${origin}/jobs`,
        },
        breadcrumbSchema(origin, [
          { name: tenantName, path: "/" },
          { name: t("seo.jobsBreadcrumb"), path: "/jobs" },
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
    customLanding?.seo?.metaTitle?.trim() || t("seo.career.homeTitle", { tenantName });
  const description =
    customLanding?.seo?.metaDescription?.trim() ||
    stripTextExcerpt(customLanding?.about?.description || customLanding?.hero?.subtitle, 158) ||
    t("seo.career.homeDescription", { tenantName });

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
        name: t("seo.career.careersSiteName", { tenantName }),
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
