export interface LandingThemeConfig {
  primaryColor: string;
  primaryHover: string;
  secondaryColor: string;
  fontFamily: string;
  darkModeHero: boolean;
  borderRadius: string; // "rounded-none" | "rounded-lg" | "rounded-2xl" | "rounded-3xl"
}

export interface LandingHeroConfig {
  badgeText: string;
  title: string;
  highlightWords: string;
  subtitle: string;
  bannerImageUrl: string;
  bannerHeight: string; // "420px" | "540px" | "640px" | "fullscreen"
  overlayOpacity: number; // 0 - 90
  showSearchBar: boolean;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

export interface StatItem {
  icon: string;
  value: string;
  label: string;
}

export interface LandingAboutConfig {
  enabled: boolean;
  badge: string;
  title: string;
  description: string;
  cultureImageUrl: string;
  stats: StatItem[];
}

export interface BenefitItem {
  icon: string;
  title: string;
  description: string;
}

export interface LandingBenefitsConfig {
  enabled: boolean;
  badge: string;
  title: string;
  subtitle: string;
  items: BenefitItem[];
}

export interface LandingTechStackConfig {
  enabled: boolean;
  badge: string;
  title: string;
  subtitle: string;
  tags: string[];
}

export interface TestimonialItem {
  name: string;
  role: string;
  avatarUrl: string;
  quote: string;
}

export interface LandingTestimonialsConfig {
  enabled: boolean;
  badge: string;
  title: string;
  items: TestimonialItem[];
}

export interface LandingFooterConfig {
  copyrightText: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
}

export interface LandingSeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl?: string;
}

export interface LandingPageConfig {
  theme: LandingThemeConfig;
  hero: LandingHeroConfig;
  about: LandingAboutConfig;
  benefits: LandingBenefitsConfig;
  techStack: LandingTechStackConfig;
  testimonials: LandingTestimonialsConfig;
  footer: LandingFooterConfig;
  seo: LandingSeoConfig;
}

export interface LandingPageResponse {
  id: number;
  config: LandingPageConfig;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLandingPageRequest {
  config: LandingPageConfig;
  publish?: boolean;
}

export interface UploadImageResponse {
  url: string;
  filename: string;
  size: number;
  contentType: string;
}
