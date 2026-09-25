package com.smarthire.tenant.landing.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.tenant.landing.dto.UploadImageResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class LandingImageStorageService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"
    );

    private final Path root;

    public LandingImageStorageService(@Value("${app.landing.storage-dir:./storage/landing}") String storageDir) {
        this.root = Path.of(storageDir).toAbsolutePath().normalize();
    }

    public UploadImageResponse upload(String tenantCode, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Image file cannot be empty", HttpStatus.BAD_REQUEST, "INVALID_FILE");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds 5MB limit", HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BusinessException("Only JPG, PNG, WEBP, GIF, SVG images are supported",
                    HttpStatus.BAD_REQUEST, "UNSUPPORTED_IMAGE_TYPE");
        }

        String safeTenant = safeSegment(tenantCode.toLowerCase(Locale.ROOT));
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.png";
        String extension = extractExtension(originalName);
        String generatedFilename = UUID.randomUUID().toString().replace("-", "") + extension;

        try {
            Path tenantDir = root.resolve(safeTenant).normalize();
            Files.createDirectories(tenantDir);

            Path targetFile = tenantDir.resolve(generatedFilename).normalize();
            if (!targetFile.startsWith(root)) {
                throw new BusinessException("Invalid file path resolution", HttpStatus.BAD_REQUEST, "INVALID_PATH");
            }

            Files.write(targetFile, file.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Stored landing image for tenant '{}' at '{}'", safeTenant, targetFile);

            String publicUrl = "/api/v1/public/landing/images/" + safeTenant + "/" + generatedFilename;
            return UploadImageResponse.builder()
                    .url(publicUrl)
                    .filename(generatedFilename)
                    .size(file.getSize())
                    .contentType(contentType)
                    .build();
        } catch (IOException e) {
            log.error("Failed to store landing image for tenant '{}'", safeTenant, e);
            throw new BusinessException("Failed to upload image", HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR");
        }
    }

    public Resource loadImage(String tenantCode, String filename) {
        String safeTenant = safeSegment(tenantCode.toLowerCase(Locale.ROOT));
        String safeFilename = safeSegment(filename);

        Path target = root.resolve(safeTenant).resolve(safeFilename).normalize();
        if (!target.startsWith(root) || !Files.exists(target) || !Files.isReadable(target)) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND, "IMAGE_NOT_FOUND");
        }

        try {
            byte[] bytes = Files.readAllBytes(target);
            return new ByteArrayResource(bytes);
        } catch (IOException e) {
            log.error("Failed to read image '{}' for tenant '{}'", safeFilename, safeTenant, e);
            throw new BusinessException("Failed to read image", HttpStatus.INTERNAL_SERVER_ERROR, "IMAGE_READ_ERROR");
        }
    }

    public MediaType probeContentType(String filename) {
        String ext = extractExtension(filename).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case ".png" -> MediaType.IMAGE_PNG;
            case ".gif" -> MediaType.IMAGE_GIF;
            case ".webp" -> MediaType.parseMediaType("image/webp");
            case ".svg" -> MediaType.parseMediaType("image/svg+xml");
            default -> MediaType.IMAGE_JPEG;
        };
    }

    private static String safeSegment(String value) {
        if (value == null || value.isBlank() || value.contains("..") || value.contains("/") || value.contains("\\")) {
            throw new BusinessException("Invalid file path parameter", HttpStatus.BAD_REQUEST, "INVALID_ARGUMENT");
        }
        return value.trim();
    }

    private static String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot >= 0 && dot < filename.length() - 1) {
            String ext = filename.substring(dot).replaceAll("[^a-zA-Z0-9.]", "").toLowerCase(Locale.ROOT);
            if (ext.length() <= 8) {
                return ext;
            }
        }
        return ".png";
    }
}
