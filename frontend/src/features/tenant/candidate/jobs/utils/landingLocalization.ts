import { useMemo } from "react";
import type { LandingPageConfig } from "@/features/tenant/admin/landing/types/landing";
import { useLocale, useT, type Locale, type TranslateFn } from "@/i18n";

function normalize(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

/**
 * Localizes tenant career landing page template content when the current locale
 * is not Vietnamese (e.g. English, Japanese) and the text in DB is the default
 * Vietnamese template seeded during tenant provisioning.
 */
export function localizeLandingConfig(
  config: LandingPageConfig | undefined,
  tenantName: string,
  t: TranslateFn,
  locale: Locale,
): LandingPageConfig | undefined {
  if (!config) return config;
  if (locale === "vi") return config;

  const clone: LandingPageConfig = JSON.parse(JSON.stringify(config));

  // 0. Header
  if (clone.header) {
    const sloganNorm = normalize(clone.header.slogan);
    if (
      !clone.header.slogan ||
      sloganNorm.includes("cong tuyen dung nhan tai") ||
      sloganNorm.includes("cong tuyen dung")
    ) {
      clone.header.slogan = t("candidate.core.header.defaultSlogan");
    }
  }

  // 1. Hero
  if (clone.hero) {
    const badgeNorm = normalize(clone.hero.badgeText);
    if (!clone.hero.badgeText || badgeNorm.includes("dan dau giai phap cong nghe")) {
      clone.hero.badgeText = t("candidate.core.career.home.slide1Eyebrow", { tenantName });
    }

    const titleNorm = normalize(clone.hero.title);
    if (!clone.hero.title || titleNorm.startsWith("chinh phuc tuong lai cong nghe")) {
      clone.hero.title = t("candidate.core.career.home.slide1Title", { tenantName });
    }

    const subNorm = normalize(clone.hero.subtitle);
    if (!clone.hero.subtitle || subNorm.includes("chung toi xay dung moi truong ky thuat")) {
      clone.hero.subtitle = t("candidate.core.career.home.slide1Desc");
    }

    const pCtaNorm = normalize(clone.hero.primaryCtaText);
    if (!clone.hero.primaryCtaText || pCtaNorm === "tim viec it") {
      clone.hero.primaryCtaText = t("candidate.core.career.home.heroPrimaryCta");
    }

    const sCtaNorm = normalize(clone.hero.secondaryCtaText);
    if (!clone.hero.secondaryCtaText || sCtaNorm === "tim hieu van hoa") {
      clone.hero.secondaryCtaText = t("candidate.core.career.home.heroSecondaryCta");
    }
  }

  // 2. About & Stats
  if (clone.about) {
    const badgeNorm = normalize(clone.about.badge);
    if (!clone.about.badge || badgeNorm === "ve chung toi") {
      clone.about.badge = t("candidate.core.career.home.aboutDefaultBadge");
    }

    const titleNorm = normalize(clone.about.title);
    if (!clone.about.title || titleNorm.startsWith("vi sao ban nen chon")) {
      clone.about.title = t("candidate.core.career.home.aboutDefaultTitle", { tenantName });
    }

    const descNorm = normalize(clone.about.description);
    if (!clone.about.description || descNorm.includes("chung toi tin rang con nguoi la tai san quy gia nhat")) {
      clone.about.description = t("candidate.core.career.home.aboutDefaultDesc", { tenantName });
    } else if (descNorm.includes("cong ty la nha")) {
      clone.about.description = t("candidate.core.career.home.aboutCompanyIsHome");
    }

    if (clone.about.stats && clone.about.stats.length > 0) {
      clone.about.stats = clone.about.stats.map((st) => {
        const lblNorm = normalize(st.label);
        let newLabel = st.label;
        if (lblNorm === "ky su phan mem & ai" || lblNorm === "ky su phan mem va ai") {
          newLabel = t("candidate.core.career.home.aboutStatEngineers");
        } else if (lblNorm.includes("sla enterprise high availability")) {
          newLabel = t("candidate.core.career.home.aboutStatSla");
        } else if (lblNorm.includes("tai tro chung chi")) {
          newLabel = t("candidate.core.career.home.aboutStatCert");
        } else if (lblNorm.includes("du an enterprise quoc te")) {
          newLabel = t("candidate.core.career.home.aboutStatProjects");
        } else if (lblNorm === "vi tri dang mo") {
          newLabel = t("candidate.core.career.home.aboutStatOpenJobs");
        } else if (lblNorm === "doi ngu dang tuyen") {
          newLabel = t("candidate.core.career.home.aboutStatTeams");
        }
        return { ...st, label: newLabel };
      });
    }
  }

  // 3. Benefits
  if (clone.benefits) {
    const badgeNorm = normalize(clone.benefits.badge);
    if (!clone.benefits.badge || badgeNorm === "dai ngo" || badgeNorm.includes("phuc loi")) {
      clone.benefits.badge = t("candidate.core.career.home.benefitsDefaultBadge");
    }

    const titleNorm = normalize(clone.benefits.title);
    if (
      !clone.benefits.title ||
      titleNorm.includes("che do dai ngo & phuc loi toan dien") ||
      titleNorm.includes("che do dai ngo va phuc loi toan dien")
    ) {
      clone.benefits.title = t("candidate.core.career.home.benefitsDefaultTitle");
    }

    const subNorm = normalize(clone.benefits.subtitle);
    if (!clone.benefits.subtitle || subNorm.includes("chung toi cham soc toan dien")) {
      clone.benefits.subtitle = t("candidate.core.career.home.benefitsDefaultSubtitle");
    }

    if (clone.benefits.items && clone.benefits.items.length > 0) {
      clone.benefits.items = clone.benefits.items.map((item) => {
        const tNorm = normalize(item.title);
        const dNorm = normalize(item.description);

        if (tNorm.includes("cham soc suc khoe") || dNorm.includes("bao hiem suc khoe cao cap")) {
          return {
            ...item,
            title: t("candidate.core.career.home.benefit1Title"),
            description: t("candidate.core.career.home.benefit1Desc"),
          };
        }
        if (tNorm.includes("thiet bi lam viec") || dNorm.includes("trang bi macbook pro")) {
          return {
            ...item,
            title: t("candidate.core.career.home.benefit2Title"),
            description: t("candidate.core.career.home.benefit2Desc"),
          };
        }
        if (tNorm.includes("dao tao & phat trien") || tNorm.includes("dao tao va phat trien") || dNorm.includes("ngan sach hoc tap")) {
          return {
            ...item,
            title: t("candidate.core.career.home.benefit3Title"),
            description: t("candidate.core.career.home.benefit3Desc"),
          };
        }
        if (tNorm.includes("can bang cuoc song") || dNorm.includes("luong thang 13")) {
          return {
            ...item,
            title: t("candidate.core.career.home.benefit4Title"),
            description: t("candidate.core.career.home.benefit4Desc"),
          };
        }
        return item;
      });
    }
  }

  // 4. Testimonials
  if (clone.testimonials) {
    const badgeNorm = normalize(clone.testimonials.badge);
    if (!clone.testimonials.badge || badgeNorm === "doi ngu") {
      clone.testimonials.badge = t("candidate.core.career.home.storiesDefaultBadge");
    }

    const titleNorm = normalize(clone.testimonials.title);
    if (
      !clone.testimonials.title ||
      titleNorm.includes("cam nhan tu cac ky su thanh vien") ||
      titleNorm.includes("danh gia tu doi ngu ky su")
    ) {
      clone.testimonials.title = t("candidate.core.career.home.storiesDefaultTitle");
    }

    if (clone.testimonials.items && clone.testimonials.items.length > 0) {
      clone.testimonials.items = clone.testimonials.items.map((item) => {
        const qNorm = normalize(item.quote);
        if (item.name === "Minh Quân" || qNorm.includes("mang lai cho toi co hoi lam viec")) {
          return {
            ...item,
            role: t("candidate.core.career.home.story1Role"),
            quote: t("candidate.core.career.home.story1Quote", { tenantName }),
          };
        }
        if (item.name === "Thu Hà" || qNorm.includes("van hoa trao quyen va ton trong y tuong moi")) {
          return {
            ...item,
            role: t("candidate.core.career.home.story2Role"),
            quote: t("candidate.core.career.home.story2Quote"),
          };
        }
        return item;
      });
    }
  }

  // 5. Footer
  if (clone.footer) {
    const copyNorm = normalize(clone.footer.copyrightText);
    if (!clone.footer.copyrightText || copyNorm.includes("bao luu moi quyen")) {
      clone.footer.copyrightText = t("candidate.core.career.footer.copyrightDefault", { tenantName });
    }
    const fDescNorm = normalize(clone.footer.description);
    if (fDescNorm.includes("cong ty la nha")) {
      clone.footer.description = t("candidate.core.career.home.aboutCompanyIsHome");
    }
  }

  return clone;
}

export function useLocalizedLanding(
  config: LandingPageConfig | undefined,
  tenantName: string,
): LandingPageConfig | undefined {
  const t = useT();
  const locale = useLocale();

  return useMemo(
    () => localizeLandingConfig(config, tenantName, t, locale),
    [config, tenantName, t, locale],
  );
}

