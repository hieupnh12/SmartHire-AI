package com.smarthire.common.seo;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves dynamic crawler metadata ({@code /robots.txt} and {@code /sitemap.xml})
 * scoped to either the SaaS master domain or the active tenant subdomain.
 */
@Hidden
@RestController
@RequiredArgsConstructor
public class SeoController {

    private static final MediaType TEXT_PLAIN_UTF8 = MediaType.parseMediaType("text/plain; charset=UTF-8");
    private static final MediaType APPLICATION_XML_UTF8 = MediaType.parseMediaType("application/xml; charset=UTF-8");

    private final SeoService seoService;

    @GetMapping(value = "/robots.txt", produces = "text/plain; charset=UTF-8")
    public ResponseEntity<String> robots(HttpServletRequest request) {
        return ResponseEntity.ok()
                .contentType(TEXT_PLAIN_UTF8)
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(seoService.buildRobotsTxt(request));
    }

    @GetMapping(value = "/sitemap.xml", produces = "application/xml; charset=UTF-8")
    public ResponseEntity<String> sitemap(HttpServletRequest request) {
        return seoService.buildSitemapXml(request)
                .map(xml -> ResponseEntity.ok()
                        .contentType(APPLICATION_XML_UTF8)
                        .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                        .body(xml))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

