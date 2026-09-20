package com.smarthire.common.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LocalFileStorageService implements FileStorageService {
    private final Path root;

    public LocalFileStorageService(@Value("${app.cv.storage-dir:./storage/cvs}") String rootDir) {
        this.root = Path.of(rootDir).toAbsolutePath().normalize();
    }

    @Override
    public StoredFile store(String tenantCode, String folder, String filename, byte[] content) throws IOException {
        Path dest = root.resolve(safe(tenantCode)).resolve(safe(folder)).resolve(safe(filename));
        Files.createDirectories(dest.getParent());
        Files.write(dest, content);
        String key = root.relativize(dest).toString().replace('\\', '/');
        return new StoredFile(key, "local://" + key);
    }

    @Override
    public byte[] read(String storageKey) throws IOException {
        Path file = root.resolve(storageKey).normalize();
        if (!file.startsWith(root)) throw new IOException("Invalid storage key");
        return Files.readAllBytes(file);
    }

    @Override
    public void delete(String storageKey) throws IOException {
        if (storageKey == null || storageKey.isBlank()) return;
        Path file = root.resolve(storageKey).normalize();
        if (!file.startsWith(root)) throw new IOException("Invalid storage key");
        Files.deleteIfExists(file);
    }

    private static String safe(String value) {
        String cleaned = (value == null ? "unknown" : value).replaceAll("[^a-zA-Z0-9._-]", "_");
        return cleaned.isBlank() ? "unknown" : cleaned.toLowerCase(Locale.ROOT);
    }
}
