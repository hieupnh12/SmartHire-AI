package com.smarthire.common.seo;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.job.service.JobService;
import com.smarthire.tenant.job.service.JobService.PublicJobSitemapEntry;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Generates host-aware {@code robots.txt} and {@code sitemap.xml} responses
 * for both the SaaS master domain and active tenant career subdomains.
 */
@Slf4j
@Service
public class SeoService {

    private static final Set<String> RESERVED_SUBDOMAINS = Set.of(
            "www", "api", "app", "admin", "master", "localhost", "smarthire-master");

    private static final List<SitemapUrl> MASTER_URLS = List.of(
            new SitemapUrl("/", "weekly", "1.0", null),
            new SitemapUrl("/solutions", "monthly", "0.9", null),
            new SitemapUrl("/pricing", "weekly", "0.9", null),
            new SitemapUrl("/preview", "monthly", "0.8", null),
            new SitemapUrl("/roi", "monthly", "0.8", null),
            new SitemapUrl("/security", "monthly", "0.8", null),
            new SitemapUrl("/demo", "monthly", "0.7", null),
            new SitemapUrl("/terms", "yearly", "0.3", null),
            new SitemapUrl("/privacy", "yearly", "0.3", null));

    private static final List<SitemapUrl> TENANT_STATIC_URLS = List.of(
            new SitemapUrl("/", "daily", "1.0", null),
            new SitemapUrl("/jobs", "daily", "0.9", null),
            new SitemapUrl("/cv-templates", "monthly", "0.6", null),
            new SitemapUrl("/cv-guide", "monthly", "0.6", null),
            new SitemapUrl("/assessments/sample", "monthly", "0.5", null));

    private final TenantRegistryService tenantRegistry;
    private final JobService jobService;
    private final String baseDomain;

    public SeoService(
            TenantRegistryService tenantRegistry,
            JobService jobService,
            @Value("${app.tenant.base-domain:smarthire.top}") String baseDomain) {
        this.tenantRegistry = tenantRegistry;
        this.jobService = jobService;
        this.baseDomain = (baseDomain == null || baseDomain.isBlank() ? "smarthire.top" : baseDomain)
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    public String buildRobotsTxt(HttpServletRequest request) {
        HostResolution host = resolveHost(request);
        return switch (host.kind()) {
            case MASTER -> """
                    User-agent: *
                    Allow: /
                    Disallow: /admin
                    Disallow: /onboard
                    Disallow: /checkout
                    Disallow: /oauth/
                    Disallow: /contracts/
                    Disallow: /api/
                    Disallow: /swagger-ui/
                    Disallow: /v3/api-docs
                    Disallow: /actuator/

                    Sitemap: %s/sitemap.xml
                    """.formatted(host.origin());
            case TENANT -> """
                    User-agent: *
                    Allow: /
                    Allow: /assessments/sample
                    Disallow: /recruiter
                    Disallow: /internal/
                    Disallow: /tenant/
                    Disallow: /company/
                    Disallow: /login
                    Disallow: /register
                    Disallow: /invite/
                    Disallow: /applications
                    Disallow: /assessments/
                    Disallow: /interviews
                    Disallow: /meet/
                    Disallow: /cv$
                    Disallow: /cv/
                    Disallow: /schedules
                    Disallow: /interview-schedules
                    Disallow: /notifications
                    Disallow: /account
                    Disallow: /api/
                    Disallow: /swagger-ui/
                    Disallow: /v3/api-docs
                    Disallow: /actuator/

                    Sitemap: %s/sitemap.xml
                    """.formatted(host.origin());
            case UNKNOWN_TENANT -> """
                    User-agent: *
                    Disallow: /
                    """;
        };
    }

    public Optional<String> buildSitemapXml(HttpServletRequest request) {
        HostResolution host = resolveHost(request);
        return switch (host.kind()) {
            case MASTER -> Optional.of(renderSitemap(host.origin(), MASTER_URLS));
            case TENANT -> Optional.of(renderTenantSitemap(host.origin(), host.tenantCode()));
            case UNKNOWN_TENANT -> Optional.empty();
        };
    }

    private String renderTenantSitemap(String origin, String tenantCode) {
        List<PublicJobSitemapEntry> jobEntries = loadTenantJobEntries(tenantCode);
        List<SitemapUrl> urls = new java.util.ArrayList<>(TENANT_STATIC_URLS.size() + jobEntries.size());
        urls.addAll(TENANT_STATIC_URLS);
        for (PublicJobSitemapEntry entry : jobEntries) {
            urls.add(new SitemapUrl("/jobs/" + entry.id(), "daily", "0.8", entry.lastModified()));
        }
        return renderSitemap(origin, urls);
    }

    private List<PublicJobSitemapEntry> loadTenantJobEntries(String tenantCode) {
        String previous = TenantContext.getCurrentTenant();
        try {
            TenantContext.setCurrentTenant(tenantCode);
            return jobService.publicSitemapEntries();
        } catch (RuntimeException ex) {
            log.warn("Failed to load public jobs for tenant '{}' sitemap; returning static career URLs only",
                    tenantCode, ex);
            return List.of();
        } finally {
            if (previous != null && !previous.isBlank()) {
                TenantContext.setCurrentTenant(previous);
            } else {
                TenantContext.clear();
            }
        }
    }

    HostResolution resolveHost(HttpServletRequest request) {
        ParsedHost parsed = parseHost(request);
        String hostName = parsed.hostName();
        String portPart = parsed.portPart();

        if (hostName.equals(baseDomain) || hostName.equals("www." + baseDomain)) {
            return HostResolution.master("https://" + baseDomain);
        }
        if (hostName.equals("localhost") || hostName.equals("127.0.0.1")) {
            return HostResolution.master("http://" + hostName + portPart);
        }

        String prodSuffix = "." + baseDomain;
        if (hostName.endsWith(prodSuffix)) {
            String label = hostName.substring(0, hostName.length() - prodSuffix.length());
            return resolveTenantSubdomain(label, subdomain -> "https://" + subdomain + "." + baseDomain);
        }

        if (hostName.endsWith(".localhost")) {
            String label = hostName.substring(0, hostName.length() - ".localhost".length());
            return resolveTenantSubdomain(label, subdomain -> "http://" + subdomain + ".localhost" + portPart);
        }

        // Prevent Host header injection by falling back to the canonical master origin.
        return HostResolution.master("https://" + baseDomain);
    }

    private HostResolution resolveTenantSubdomain(String label, java.util.function.UnaryOperator<String> originBuilder) {
        if (label.isBlank() || label.contains(".") || RESERVED_SUBDOMAINS.contains(label)) {
            return HostResolution.unknown();
        }
        try {
            TenantInfo tenant = tenantRegistry.requireActiveBySubdomain(label);
            String canonicalSub = (tenant.getSubdomain() == null || tenant.getSubdomain().isBlank()
                    ? label
                    : tenant.getSubdomain()).trim().toLowerCase(Locale.ROOT);
            return HostResolution.tenant(originBuilder.apply(canonicalSub), tenant.getCode());
        } catch (BusinessException ex) {
            return HostResolution.unknown();
        }
    }

    private ParsedHost parseHost(HttpServletRequest request) {
        String candidate = firstNonBlank(
                request.getHeader("X-Forwarded-Host"),
                request.getHeader("Host"),
                request.getServerName());
        if (candidate == null || candidate.isBlank()) {
            return new ParsedHost(baseDomain, "");
        }
        String first = candidate.split(",")[0].trim().toLowerCase(Locale.ROOT);
        if (first.startsWith("[")) {
            int closing = first.indexOf(']');
            if (closing > 0) {
                return new ParsedHost(first.substring(1, closing), "");
            }
        }
        int colon = first.lastIndexOf(':');
        if (colon > 0) {
            String host = first.substring(0, colon);
            String port = first.substring(colon + 1);
            String portPart = port.matches("\\d+") && !port.equals("80") && !port.equals("443") ? ":" + port : "";
            return new ParsedHost(host, portPart);
        }
        return new ParsedHost(first, "");
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String renderSitemap(String origin, List<SitemapUrl> urls) {
        StringBuilder xml = new StringBuilder(1024);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (SitemapUrl url : urls) {
            String loc = origin + url.path();
            xml.append("  <url>\n");
            xml.append("    <loc>").append(escapeXml(loc)).append("</loc>\n");
            if (url.lastModified() != null) {
                xml.append("    <lastmod>").append(DateTimeFormatter.ISO_INSTANT.format(url.lastModified())).append("</lastmod>\n");
            }
            if (url.changeFreq() != null) {
                xml.append("    <changefreq>").append(url.changeFreq()).append("</changefreq>\n");
            }
            if (url.priority() != null) {
                xml.append("    <priority>").append(url.priority()).append("</priority>\n");
            }
            xml.append("  </url>\n");
        }
        xml.append("</urlset>\n");
        return xml.toString();
    }

    private static String escapeXml(String input) {
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    enum HostKind {
        MASTER, TENANT, UNKNOWN_TENANT
    }

    record HostResolution(HostKind kind, String origin, String tenantCode) {
        static HostResolution master(String origin) {
            return new HostResolution(HostKind.MASTER, origin, null);
        }

        static HostResolution tenant(String origin, String tenantCode) {
            return new HostResolution(HostKind.TENANT, origin, tenantCode);
        }

        static HostResolution unknown() {
            return new HostResolution(HostKind.UNKNOWN_TENANT, null, null);
        }
    }

    private record ParsedHost(String hostName, String portPart) {}

    private record SitemapUrl(String path, String changeFreq, String priority, Instant lastModified) {}
}

