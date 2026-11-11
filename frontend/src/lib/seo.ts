export interface SeoConfig {
  title: string;
  description?: string;
  canonicalUrl?: string;
  robots?: string;
  ogType?: "website" | "article";
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogLocale?: string;
  twitterCard?: "summary" | "summary_large_image";
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_PRODUCTION_ORIGIN = "https://smarthire.top";

/** Returns the canonical origin for the current host (normalizing www -> apex). */
export function getCanonicalOrigin(): string {
  if (typeof window === "undefined") return DEFAULT_PRODUCTION_ORIGIN;
  const { protocol, hostname, port } = window.location;
  const lowerHost = hostname.toLowerCase();
  if (lowerHost === "www.smarthire.top" || lowerHost === "smarthire.top") {
    return DEFAULT_PRODUCTION_ORIGIN;
  }
  const portPart = port && port !== "80" && port !== "443" ? `:${port}` : "";
  return `${protocol}//${lowerHost}${portPart}`;
}

/** Resolves a relative asset path or external URL to an absolute HTTPS/HTTP URL. */
export function toAbsoluteUrl(pathOrUrl: string | null | undefined, origin = getCanonicalOrigin()): string {
  const trimmed = pathOrUrl?.trim();
  if (!trimmed) return `${origin}/og-smarthire.png`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin}${normalized}`;
}

/** Produces a clean single-line excerpt suitable for meta description tags. */
export function stripTextExcerpt(input: string | null | undefined, maxLength = 158): string {
  if (!input) return "";
  const plain = input
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`~>|[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  const truncated = plain.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}…`;
}

function upsertMeta(attr: "name" | "property", key: string, content: string | undefined): void {
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement("meta");
  el.setAttribute(attr, key);
  el.setAttribute("content", content);
  if (!existing) document.head.appendChild(el);
}

function upsertCanonical(href: string | undefined): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement("link");
  el.setAttribute("rel", "canonical");
  el.setAttribute("href", href);
  if (!existing) document.head.appendChild(el);
}

function syncJsonLd(payload: SeoConfig["jsonLd"]): void {
  document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
  if (!payload) return;
  const schemas = Array.isArray(payload) ? payload : [payload];
  for (const schema of schemas) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
}

/** Updates document title, meta tags, canonical link, Open Graph, Twitter cards, and JSON-LD. */
export function applyDocumentSeo(config: SeoConfig): void {
  if (typeof document === "undefined") return;

  const origin = getCanonicalOrigin();
  const robots = config.robots ?? "index, follow";
  const isNoIndex = robots.toLowerCase().includes("noindex");
  const title = config.title.trim();
  const description = config.description?.trim();
  const canonicalUrl = isNoIndex ? undefined : config.canonicalUrl;
  const ogImage = toAbsoluteUrl(config.ogImage, origin);

  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);
  upsertCanonical(canonicalUrl);

  upsertMeta("property", "og:type", config.ogType ?? "website");
  upsertMeta("property", "og:site_name", config.ogSiteName ?? "SmartHire AI");
  upsertMeta("property", "og:locale", config.ogLocale ?? "vi_VN");
  upsertMeta("property", "og:title", config.ogTitle ?? title);
  upsertMeta("property", "og:description", config.ogDescription ?? description);
  upsertMeta("property", "og:url", canonicalUrl ?? `${origin}${window.location.pathname}`);
  upsertMeta("property", "og:image", ogImage);

  upsertMeta("name", "twitter:card", config.twitterCard ?? "summary_large_image");
  upsertMeta("name", "twitter:title", config.ogTitle ?? title);
  upsertMeta("name", "twitter:description", config.ogDescription ?? description);
  upsertMeta("name", "twitter:image", ogImage);

  syncJsonLd(isNoIndex ? undefined : config.jsonLd);
}

