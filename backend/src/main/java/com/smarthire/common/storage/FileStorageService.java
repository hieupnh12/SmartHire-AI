package com.smarthire.common.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FileStorageService {
    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private final Cloudinary cloudinary;
    private final HttpClient http;

    @Autowired
    public FileStorageService(
            @Value("${app.cv.cloudinary-cloud-name:}") String cloudName,
            @Value("${app.cv.cloudinary-api-key:}") String apiKey,
            @Value("${app.cv.cloudinary-api-secret:}") String apiSecret) {
        this(new Cloudinary(ObjectUtils.asMap(
                "cloud_name", require("CLOUDINARY_CLOUD_NAME", cloudName),
                "api_key", require("CLOUDINARY_API_KEY", apiKey),
                "api_secret", require("CLOUDINARY_API_SECRET", apiSecret),
                "secure", true)), HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(20))
                .build());
        log.info("CV files are stored only on Cloudinary");
    }

    FileStorageService(Cloudinary cloudinary, HttpClient http) {
        this.cloudinary = cloudinary;
        this.http = http;
    }

    public StoredFile store(String tenantId, String cvId, String filename, byte[] content) throws IOException {
        String safeTenant = safeSegment(tenantId, "tenantId");
        String safeCvId = safeSegment(cvId, "cvId");
        String ext = extension(filename);
        boolean pdf = "pdf".equals(ext);
        String resourceType = pdf ? "image" : "raw";
        String publicId = "cv_" + safeTenant + "_" + safeCvId + (pdf ? "" : "." + ext);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(content, ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "type", "upload",
                    "public_id", publicId,
                    "overwrite", true));
            Object url = result.get("secure_url");
            if (url == null || url.toString().isBlank()) {
                throw new IOException("Cloudinary did not return a file URL");
            }
            log.info("Stored CV {} ({}) at {}", publicId, resourceType, url);
            return new StoredFile(url.toString(), "/api/v1/cvs/" + safeCvId + "/file");
        } catch (IOException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IOException("Failed to store CV on Cloudinary", ex);
        }
    }

    public byte[] read(String storageKey) throws IOException {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IOException("storageKey is required");
        }
        IOException last = null;
        for (String url : deliveryCandidates(storageKey)) {
            try {
                HttpResponse<byte[]> response = http.send(
                        HttpRequest.newBuilder(URI.create(url)).GET().timeout(Duration.ofSeconds(30)).build(),
                        HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() < 400) {
                    return response.body();
                }
                log.warn("Cloudinary GET returned {}", response.statusCode());
                last = new IOException("CV file not found: " + storageKey);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new IOException("Failed to read CV from Cloudinary", ex);
            } catch (IOException ex) {
                last = ex;
            } catch (Exception ex) {
                last = new IOException("Failed to read CV from Cloudinary", ex);
            }
        }
        throw last != null ? last : new IOException("CV file not found: " + storageKey);
    }

    public void delete(String storageKey) throws IOException {
        if (storageKey == null || storageKey.isBlank()) return;
        try {
            String publicId = publicIdFrom(storageKey);
            String baseId = stripExtension(publicId);
            for (String resourceType : new String[] { "image", "raw" }) {
                for (String id : new String[] { publicId, baseId }) {
                    cloudinary.uploader().destroy(id, ObjectUtils.asMap("resource_type", resourceType, "type", "upload"));
                    cloudinary.uploader().destroy(id, ObjectUtils.asMap("resource_type", resourceType, "type", "authenticated"));
                }
            }
        } catch (IOException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IOException("Failed to delete CV from Cloudinary", ex);
        }
    }

    List<String> deliveryCandidates(String storageKey) {
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        if (storageKey.startsWith("https://") || storageKey.startsWith("http://")) {
            urls.add(storageKey);
        }
        String publicId = publicIdFrom(storageKey);
        String baseId = stripExtension(publicId);
        String format = extension(publicId);
        for (String resourceType : new String[] { "image", "raw" }) {
            for (String type : new String[] { "upload", "authenticated", "private" }) {
                addDownload(urls, baseId, format, resourceType, type);
                addDownload(urls, publicId, null, resourceType, type);
            }
        }
        urls.removeIf(url -> url == null || url.isBlank());
        return new ArrayList<>(urls);
    }

    private void addDownload(LinkedHashSet<String> urls, String publicId, String format, String resourceType, String type) {
        try {
            urls.add(cloudinary.privateDownload(publicId, format, ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "type", type)));
        } catch (Exception ex) {
            log.warn("Cloudinary download {} {} failed: {}", resourceType, publicId, ex.toString());
        }
    }

    static String publicIdFrom(String storageKey) {
        if (storageKey == null || storageKey.isBlank()
                || (!storageKey.startsWith("https://") && !storageKey.startsWith("http://"))) {
            return storageKey;
        }
        for (String token : new String[] { "/upload/", "/authenticated/", "/private/" }) {
            int idx = storageKey.indexOf(token);
            if (idx < 0) {
                continue;
            }
            String rest = storageKey.substring(idx + token.length());
            if (rest.startsWith("s--")) {
                int slash = rest.indexOf('/');
                if (slash > 0) rest = rest.substring(slash + 1);
            }
            if (rest.startsWith("v") && rest.length() > 1 && Character.isDigit(rest.charAt(1))) {
                int slash = rest.indexOf('/');
                if (slash > 0) rest = rest.substring(slash + 1);
            }
            return rest;
        }
        return storageKey;
    }

    static String stripExtension(String publicId) {
        int slash = publicId.lastIndexOf('/');
        int dot = publicId.lastIndexOf('.');
        if (dot > slash && dot > 0) {
            return publicId.substring(0, dot);
        }
        return publicId;
    }

    private static String require(String name, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required; CV files are stored only on Cloudinary");
        }
        return value.trim();
    }

    private static String extension(String filename) {
        int slash = filename.lastIndexOf('/');
        String name = slash >= 0 ? filename.substring(slash + 1) : filename;
        int dot = name.lastIndexOf('.');
        if (dot <= 0 || dot == name.length() - 1) return "pdf";
        String ext = name.substring(dot + 1).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        return ext.isBlank() ? "pdf" : ext;
    }

    private static String safeSegment(String value, String field) {
        if (value == null || value.isBlank() || value.equals(".") || value.equals("..")
                || value.contains("/") || value.contains("\\")) {
            throw new IllegalArgumentException(field + " contains an invalid path segment");
        }
        return value.toLowerCase(Locale.ROOT);
    }

    public record StoredFile(String storageKey, String url) {}
}
