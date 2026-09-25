package com.smarthire.multitenancy.service;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.context.TenantContext;
import java.net.URI;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TenantPublicUrlService {
    private final TenantRegistryService registry;
    private final String publicOrigin;
    private final String baseDomain;

    public TenantPublicUrlService(
            TenantRegistryService registry,
            @Value("${smarthire.invite.public-origin:http://localhost:5173}") String publicOrigin,
            @Value("${app.tenant.base-domain:smarthire.top}") String baseDomain) {
        this.registry = registry;
        this.publicOrigin = publicOrigin;
        this.baseDomain = baseDomain == null ? "smarthire.top" : baseDomain.toLowerCase(Locale.ROOT);
    }

    public String path(String path) {
        String tenantKey = TenantContext.getCurrentTenant();
        TenantInfo tenant = registry.requireActive(tenantKey);
        String subdomain = tenant.getSubdomain() == null || tenant.getSubdomain().isBlank()
                ? tenant.getCode()
                : tenant.getSubdomain();
        return origin(subdomain.toLowerCase(Locale.ROOT), path);
    }

    String origin(String subdomain, String path) {
        URI origin = URI.create(publicOrigin);
        String scheme = origin.getScheme() == null ? "http" : origin.getScheme();
        String host = apexHost(origin.getHost());
        int port = origin.getPort();
        String portPart = port > 0 ? ":" + port : "";
        String normalized = path == null || path.isBlank() ? "/" : (path.startsWith("/") ? path : "/" + path);
        return scheme + "://" + subdomain + "." + host + portPart + normalized;
    }

    private String apexHost(String host) {
        if (host == null || host.isBlank()) return "localhost";
        String value = host.toLowerCase(Locale.ROOT);
        if (value.endsWith(".localhost")) return "localhost";
        if (value.endsWith("." + baseDomain)) return baseDomain;
        return value;
    }
}
