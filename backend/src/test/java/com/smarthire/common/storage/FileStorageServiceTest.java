package com.smarthire.common.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {
    @Mock Cloudinary cloudinary;
    @Mock Uploader uploader;

    @Test
    void storesPdfAsImageWithoutExtensionInPublicId() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/gduy2tfn/image/upload/v12/cv_se36_12.pdf"));
        FileStorageService storage = new FileStorageService(cloudinary, null);

        var stored = storage.store("se36", "12", "White Business Consultant Resume CV (1).pdf", new byte[] { 1, 2, 3 });
        assertThat(stored.storageKey()).isEqualTo("https://res.cloudinary.com/gduy2tfn/image/upload/v12/cv_se36_12.pdf");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> options = ArgumentCaptor.forClass(Map.class);
        verify(uploader).upload(eq(new byte[] { 1, 2, 3 }), options.capture());
        assertThat(options.getValue().get("public_id")).isEqualTo("cv_se36_12");
        assertThat(options.getValue().get("resource_type")).isEqualTo("image");
    }

    @Test
    void storesDocxAsRaw() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/gduy2tfn/raw/upload/v12/cv_se36_12.docx"));
        FileStorageService storage = new FileStorageService(cloudinary, null);

        storage.store("se36", "12", "cv.docx", new byte[] { 1, 2, 3 });

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> options = ArgumentCaptor.forClass(Map.class);
        verify(uploader).upload(eq(new byte[] { 1, 2, 3 }), options.capture());
        assertThat(options.getValue().get("public_id")).isEqualTo("cv_se36_12.docx");
        assertThat(options.getValue().get("resource_type")).isEqualTo("raw");
    }

    @Test
    void deleteDestroysImageAndRawPublicIds() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        FileStorageService storage = new FileStorageService(cloudinary, null);
        storage.delete("https://res.cloudinary.com/gduy2tfn/image/upload/v12/cv_se36_12.pdf");
        verify(uploader, atLeastOnce()).destroy(eq("cv_se36_12.pdf"), anyMap());
        verify(uploader, atLeastOnce()).destroy(eq("cv_se36_12"), anyMap());
    }

    @Test
    void publicIdFromStripsVersionPrefix() {
        assertThat(FileStorageService.publicIdFrom(
                "https://res.cloudinary.com/gduy2tfn/image/upload/v1758/cv_se36_12.pdf"))
                .isEqualTo("cv_se36_12.pdf");
        assertThat(FileStorageService.stripExtension("cv_se36_12.pdf")).isEqualTo("cv_se36_12");
    }

    @Test
    void rejectsMissingCloudinaryConfig() {
        assertThatThrownBy(() -> new FileStorageService("", "key", "secret"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CLOUDINARY_CLOUD_NAME");
    }
}
