package com.smarthire.common.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileStorageServiceTest {
    @TempDir Path directory;

    @Test
    void storesReadsAndDeletesFile() throws Exception {
        FileStorageService storage = new FileStorageService(directory.toString());

        var stored = storage.store("tenant-a", "42", "candidate.pdf", new byte[] {1, 2, 3});

        assertThat(stored.storageKey()).isEqualTo("tenant-a/42/candidate.pdf");
        assertThat(stored.url()).isEqualTo("/api/v1/cvs/42/file");
        assertThat(storage.read(stored.storageKey())).containsExactly(1, 2, 3);

        storage.delete(stored.storageKey());
        assertThat(Files.exists(directory.resolve(stored.storageKey()))).isFalse();
    }

    @Test
    void rejectsPathTraversal() {
        FileStorageService storage = new FileStorageService(directory.toString());

        assertThatThrownBy(() -> storage.read("../secret.txt"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.store("../tenant", "42", "cv.pdf", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
