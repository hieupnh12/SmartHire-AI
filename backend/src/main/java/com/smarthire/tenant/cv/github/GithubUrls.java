package com.smarthire.tenant.cv.github;

import java.net.URI;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/** Accepts only public https://github.com profile and repository URLs. */
public final class GithubUrls {
    public enum Kind { PROFILE, REPOSITORY }

    public record GithubRef(Kind kind, String owner, String repo, String canonical) {
        public String fullName() {
            return repo == null ? owner : owner + "/" + repo;
        }
    }

    private static final Pattern OWNER = Pattern.compile("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$");
    private static final Pattern REPO = Pattern.compile("^[A-Za-z0-9._-]{1,100}$");
    private static final Set<String> RESERVED = Set.of(
            "about", "account", "apps", "collections", "customer-stories", "codespaces", "enterprise",
            "events", "explore", "features", "login", "marketplace", "new", "notifications", "orgs",
            "organizations", "pricing", "pulls", "readme", "search", "security", "settings", "signup",
            "sponsors", "team", "topics", "trending");

    private GithubUrls() {}

    public static Optional<GithubRef> parse(String raw) {
        if (raw == null || raw.isBlank() || raw.length() > 300) return Optional.empty();
        String trimmed = raw.trim();
        if (trimmed.contains("\\") || trimmed.contains("@")) return Optional.empty();
        String withScheme = trimmed.startsWith("https://") || trimmed.startsWith("http://")
                ? trimmed
                : "https://" + trimmed;
        if (!withScheme.startsWith("https://")) return Optional.empty();
        URI uri;
        try {
            uri = URI.create(withScheme);
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
        if (!"https".equalsIgnoreCase(uri.getScheme())) return Optional.empty();
        if (uri.getUserInfo() != null || uri.getRawUserInfo() != null) return Optional.empty();
        if (uri.getPort() != -1 && uri.getPort() != 443) return Optional.empty();
        String host = uri.getHost();
        if (host == null) return Optional.empty();
        host = host.toLowerCase(Locale.ROOT);
        if (host.startsWith("www.")) host = host.substring(4);
        if (!"github.com".equals(host)) return Optional.empty();
        String path = uri.getPath() == null ? "" : uri.getPath();
        String[] parts = path.split("/");
        String owner = "";
        String repo = null;
        int seen = 0;
        for (String part : parts) {
            if (part.isBlank()) continue;
            if (part.contains("..") || part.contains("%")) return Optional.empty();
            if (seen == 0) owner = part;
            else if (seen == 1) repo = part;
            seen++;
        }
        if (seen == 0 || !OWNER.matcher(owner).matches() || RESERVED.contains(owner.toLowerCase(Locale.ROOT))) {
            return Optional.empty();
        }
        if (repo == null) {
            return Optional.of(new GithubRef(Kind.PROFILE, owner, null, "https://github.com/" + owner));
        }
        if (repo.endsWith(".git")) repo = repo.substring(0, repo.length() - 4);
        if (!REPO.matcher(repo).matches() || repo.equals(".") || repo.equals("..")) return Optional.empty();
        return Optional.of(new GithubRef(Kind.REPOSITORY, owner, repo, "https://github.com/" + owner + "/" + repo));
    }
}
