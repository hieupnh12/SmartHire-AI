package com.smarthire.tenant.landing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.tenant.entity.LandingPageSetting;
import com.smarthire.domain.tenant.repository.LandingPageSettingRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.landing.dto.LandingPageConfigDto;
import com.smarthire.tenant.landing.dto.LandingPageResponse;
import com.smarthire.tenant.landing.dto.UpdateLandingPageRequest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LandingPageServiceImpl implements LandingPageService {

    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final LandingPageSettingRepository settingRepository;
    private final TenantInfoRepository tenantInfoRepository;
    private final RedisService redisService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public LandingPageConfigDto getPublicLandingConfig() {
        String tenantCode = requireTenantCode();
        String cacheKey = RedisKeys.landingPage(tenantCode);

        Optional<String> cachedJson = redisService.get(cacheKey);
        if (cachedJson.isPresent() && !cachedJson.get().isBlank()) {
            try {
                return objectMapper.readValue(cachedJson.get(), LandingPageConfigDto.class);
            } catch (JsonProcessingException e) {
                log.warn("Corrupted landing cache for tenant '{}', invalidating", tenantCode, e);
                redisService.delete(cacheKey);
            }
        }

        Optional<LandingPageSetting> settingOpt = settingRepository.findFirstByOrderByIdAsc();
        LandingPageConfigDto config;
        if (settingOpt.isPresent()) {
            LandingPageSetting setting = settingOpt.get();
            config = parseConfig(setting.getConfigJson());
        } else {
            config = createDefaultConfig(tenantCode);
        }

        try {
            String json = objectMapper.writeValueAsString(config);
            redisService.set(cacheKey, json, CACHE_TTL);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize landing config for cache", e);
        }

        return config;
    }

    @Override
    @Transactional
    public LandingPageResponse getAdminLandingPage() {
        String tenantCode = requireTenantCode();
        LandingPageSetting setting = settingRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> initDefaultSetting(tenantCode));

        return toResponse(setting);
    }

    @Override
    @Transactional
    public LandingPageResponse updateLandingPage(UpdateLandingPageRequest request) {
        String tenantCode = requireTenantCode();
        LandingPageSetting setting = settingRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> LandingPageSetting.builder().build());

        String json;
        try {
            json = objectMapper.writeValueAsString(request.getConfig());
        } catch (JsonProcessingException e) {
            throw new BusinessException("Invalid landing page configuration format",
                    HttpStatus.BAD_REQUEST, "INVALID_CONFIG_JSON");
        }

        boolean publish = request.getPublish() != null && request.getPublish();
        setting.setConfigJson(json);
        setting.setPublished(publish);
        if (publish) {
            setting.setPublishedAt(Instant.now());
            redisService.set(RedisKeys.landingPage(tenantCode), json, CACHE_TTL);
        } else {
            redisService.delete(RedisKeys.landingPage(tenantCode));
        }

        LandingPageSetting saved = settingRepository.save(setting);
        log.info("Tenant '{}' updated landing page (published={})", tenantCode, publish);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public LandingPageResponse resetToDefault() {
        String tenantCode = requireTenantCode();
        LandingPageSetting setting = settingRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> LandingPageSetting.builder().build());

        LandingPageConfigDto defaultConfig = createDefaultConfig(tenantCode);
        String json;
        try {
            json = objectMapper.writeValueAsString(defaultConfig);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to generate default configuration",
                    HttpStatus.INTERNAL_SERVER_ERROR, "CONFIG_SERIALIZE_ERROR");
        }

        setting.setConfigJson(json);
        setting.setPublished(true);
        setting.setPublishedAt(Instant.now());

        LandingPageSetting saved = settingRepository.save(setting);
        redisService.set(RedisKeys.landingPage(tenantCode), json, CACHE_TTL);
        log.info("Tenant '{}' reset landing page to default template", tenantCode);

        return toResponse(saved);
    }

    private LandingPageSetting initDefaultSetting(String tenantCode) {
        LandingPageConfigDto defaultConfig = createDefaultConfig(tenantCode);
        String json;
        try {
            json = objectMapper.writeValueAsString(defaultConfig);
        } catch (JsonProcessingException e) {
            json = "{}";
        }

        LandingPageSetting setting = LandingPageSetting.builder()
                .configJson(json)
                .published(true)
                .publishedAt(Instant.now())
                .build();
        return settingRepository.save(setting);
    }

    private LandingPageConfigDto createDefaultConfig(String tenantCode) {
        LandingPageConfigDto config = new LandingPageConfigDto();
        String brandName = tenantCode.toUpperCase(Locale.ROOT);

        Optional<TenantInfo> tenantInfo = tenantInfoRepository.findByCode(tenantCode)
                .or(() -> tenantInfoRepository.findBySubdomain(tenantCode));

        String customDesc = null;
        if (tenantInfo.isPresent()) {
            TenantInfo info = tenantInfo.get();
            if (info.getName() != null && !info.getName().isBlank()) {
                brandName = info.getName();
            }
            if (info.getDescription() != null && !info.getDescription().isBlank()) {
                customDesc = info.getDescription();
            }
            if (info.getAddress() != null && !info.getAddress().isBlank()) {
                config.getFooter().setAddress(info.getAddress());
            }
            if (info.getContactEmail() != null && !info.getContactEmail().isBlank()) {
                config.getFooter().setContactEmail(info.getContactEmail());
            }
            if (info.getContactPhone() != null && !info.getContactPhone().isBlank()) {
                config.getFooter().setContactPhone(info.getContactPhone());
            }
            if (info.getWebsite() != null && !info.getWebsite().isBlank()) {
                config.getFooter().setWebsiteUrl(info.getWebsite());
            }
        }

        // Hero Config
        config.getHero().setBannerImageUrl("/acme_tech_hero.png");
        config.getHero().setTitle("Chinh Phục Tương Lai Công Nghệ Cùng " + brandName);
        config.getHero().setBadgeText("Dẫn đầu Giải pháp Công nghệ Enterprise Multi-Tenant & AI");
        config.getHero().setHighlightWords(brandName);
        config.getHero().setSubtitle(customDesc != null ? customDesc :
                "Chúng tôi xây dựng môi trường kỹ thuật chuẩn International Enterprise — Nơi các Kỹ sư Phần mềm & AI được phát triển những sản phẩm công nghệ tạo giá trị thực sự.");
        config.getHero().setBannerHeight("540px");
        config.getHero().setOverlayOpacity(75);
        config.getHero().setShowSearchBar(true);
        config.getHero().setPrimaryCtaText("Tìm Việc IT");
        config.getHero().setSecondaryCtaText("Tìm Hiểu Văn Hóa");

        // About & Stats
        config.getAbout().setEnabled(true);
        config.getAbout().setBadge("Về Chúng Tôi");
        config.getAbout().setCultureImageUrl("/acme_culture.png");
        config.getAbout().setTitle("Vì Sao Bạn Nên Chọn " + brandName + "?");
        config.getAbout().setDescription(customDesc != null ? customDesc :
                "Tại " + brandName + ", chúng tôi tin rằng con người là tài sản quý giá nhất. Đội ngũ Kỹ sư làm việc trong môi trường cởi mở, áp dụng quy trình Agile/Scrum tiêu chuẩn toàn cầu, liên tục tiếp cận các bài toán Enterprise thách thức.");
        config.getAbout().setStats(List.of(
                new LandingPageConfigDto.StatItem("Users", "500+", "Kỹ Sư Phần Mềm & AI"),
                new LandingPageConfigDto.StatItem("Zap", "99.99%", "SLA Enterprise High Availability"),
                new LandingPageConfigDto.StatItem("Award", "100%", "Tài Trợ Chứng Chỉ AWS/GCP"),
                new LandingPageConfigDto.StatItem("Globe", "Global", "Dự Án Enterprise Quốc Tế")
        ));

        // Benefits
        config.getBenefits().setEnabled(true);
        config.getBenefits().setBadge("Đãi Ngộ");
        config.getBenefits().setTitle("Chế Độ Đãi Ngộ & Phúc Lợi Toàn Diện");
        config.getBenefits().setSubtitle("Chúng tôi chăm sóc toàn diện cho sức khỏe, sự nghiệp và đời sống tinh thần của bạn");
        config.getBenefits().setItems(List.of(
                new LandingPageConfigDto.BenefitItem("HeartHandshake", "Chăm Sóc Sức Khỏe Toàn Diện", "Bảo hiểm sức khỏe cao cấp cho nhân viên và người thân, khám sức khỏe định kỳ hàng năm."),
                new LandingPageConfigDto.BenefitItem("Laptop", "Thiết Bị Làm Việc Hiện Đại", "Trang bị Macbook Pro / Laptop cấu hình cao cùng màn hình 4K và trợ cấp setup góc làm việc."),
                new LandingPageConfigDto.BenefitItem("TrendingUp", "Đào Tạo & Phát Triển Chuyên Sâu", "Ngân sách học tập cá nhân, hỗ trợ thi chứng chỉ quốc tế và các buổi tech-talk chia sẻ nội bộ."),
                new LandingPageConfigDto.BenefitItem("Coffee", "Cân Bằng Cuộc Sống & Thưởng Hiệu Suất", "Lương tháng 13, thưởng dự án, ngày nghỉ phép linh hoạt và tiệc teambuilding định kỳ.")
        ));

        // Tech Stack
        config.getTechStack().setEnabled(true);
        config.getTechStack().setBadge("Tech Stack");
        config.getTechStack().setTitle("Hệ Sinh Thái Công Nghệ & Kỹ Năng");
        config.getTechStack().setSubtitle("Ứng dụng các công nghệ hiện đại và kiến trúc vi dịch vụ mở rộng cao");
        config.getTechStack().setTags(new ArrayList<>(List.of(
                "Java 21", "Spring Boot", "React", "TypeScript", "Docker", "Kubernetes", "Redis", "RabbitMQ", "MySQL", "AI / Machine Learning"
        )));

        // Testimonials
        config.getTestimonials().setEnabled(true);
        config.getTestimonials().setBadge("Đội Ngũ");
        config.getTestimonials().setTitle("Cảm Nhận Từ Các Kỹ Sư Thành Viên");
        config.getTestimonials().setItems(List.of(
                new LandingPageConfigDto.TestimonialItem("Minh Quân", "Senior Software Engineer", "", "Môi trường tại " + brandName + " mang lại cho tôi cơ hội làm việc với các hệ thống phân tán lớn và học hỏi liên tục từ các đồng nghiệp tài năng."),
                new LandingPageConfigDto.TestimonialItem("Thu Hà", "Tech Lead / Architect", "", "Văn hóa trao quyền và tôn trọng ý tưởng mới là điều tôi yêu thích nhất ở đây. Bạn luôn có không gian để tạo ra đột phá và nâng tầm giải pháp.")
        ));

        // Footer & SEO
        config.getFooter().setCopyrightText("© " + java.time.Year.now().getValue() + " " + brandName + ". Bảo lưu mọi quyền.");
        config.getSeo().setMetaTitle(brandName + " - Cơ Hội Nghề Nghiệp & Tuyển Dụng Công Nghệ");
        config.getSeo().setMetaDescription("Khám phá các vị trí tuyển dụng kỹ sư phần mềm, AI và công nghệ tại " + brandName + ". Môi trường làm việc chuẩn mực và chế độ đãi ngộ hấp dẫn.");
        return config;
    }

    private LandingPageResponse toResponse(LandingPageSetting setting) {
        return LandingPageResponse.builder()
                .id(setting.getId())
                .config(parseConfig(setting.getConfigJson()))
                .published(setting.isPublished())
                .publishedAt(setting.getPublishedAt())
                .createdAt(setting.getCreatedAt())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }

    private LandingPageConfigDto parseConfig(String json) {
        if (json == null || json.isBlank()) {
            return new LandingPageConfigDto();
        }
        try {
            return objectMapper.readValue(json, LandingPageConfigDto.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse landing page config JSON", e);
            return new LandingPageConfigDto();
        }
    }

    private String requireTenantCode() {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            throw new BusinessException("Tenant context is required", HttpStatus.BAD_REQUEST, "TENANT_REQUIRED");
        }
        return tenantCode.trim().toLowerCase(Locale.ROOT);
    }
}
