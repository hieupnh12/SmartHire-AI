package com.smarthire.common.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FileStorageService {
    private final Path root;

    public FileStorageService(@Value("${app.cv.storage-dir:./storage/cvs}") String storageDir) {
        this.root = Path.of(storageDir).toAbsolutePath().normalize();
    }

    public StoredFile store(String tenantId, String cvId, String filename, byte[] content) throws IOException {
        String safeTenant = safeSegment(tenantId, "tenantId");
        String safeCvId = safeSegment(cvId, "cvId");
        String safeFilename = safeSegment(filename, "filename");
        String storageKey = safeTenant + "/" + safeCvId + "/" + safeFilename;
        Path target = resolve(storageKey);
        Files.createDirectories(target.getParent());
        Files.write(target, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return new StoredFile(storageKey, "/api/v1/cvs/" + safeCvId + "/file");
    }

    public byte[] read(String storageKey) throws IOException {
        return Files.readAllBytes(resolve(storageKey));
    }

    public void delete(String storageKey) throws IOException {
        if (storageKey == null || storageKey.isBlank()) return;
        Path file = resolve(storageKey);
        Files.deleteIfExists(file);
        deleteEmptyParent(file.getParent());
    }

    private Path resolve(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IllegalArgumentException("storageKey is required");
        }
        Path target = root.resolve(storageKey).normalize();
        if (!target.startsWith(root)) throw new IllegalArgumentException("Invalid storage key");
        return target;
    }

    private void deleteEmptyParent(Path directory) throws IOException {
        if (directory == null || directory.equals(root)) return;
        try (var children = Files.list(directory)) {
            if (children.findAny().isPresent()) return;
        }
        Files.deleteIfExists(directory);
    }

    private static String safeSegment(String value, String field) {
        if (value == null || value.isBlank() || value.equals(".") || value.equals("..")
                || value.contains("/") || value.contains("\\")) {
            throw new IllegalArgumentException(field + " contains an invalid path segment");
        }
        return value;
    }

    public record StoredFile(String storageKey, String url) {}
}
