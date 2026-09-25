package com.smarthire.tenant.landing.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LandingPageConfigDto {

    @Builder.Default
    private ThemeConfig theme = new ThemeConfig();

    @Builder.Default
    private HeroConfig hero = new HeroConfig();

    @Builder.Default
    private AboutConfig about = new AboutConfig();

    @Builder.Default
    private BenefitsConfig benefits = new BenefitsConfig();

    @Builder.Default
    private TechStackConfig techStack = new TechStackConfig();

    @Builder.Default
    private TestimonialsConfig testimonials = new TestimonialsConfig();

    @Builder.Default
    private FooterConfig footer = new FooterConfig();

    @Builder.Default
    private SeoConfig seo = new SeoConfig();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ThemeConfig {
        @Builder.Default
        private String primaryColor = "#0058be";
        @Builder.Default
        private String primaryHover = "#004395";
        @Builder.Default
        private String secondaryColor = "#505f76";
        @Builder.Default
        private String fontFamily = "Inter";
        @Builder.Default
        private boolean darkModeHero = true;
        @Builder.Default
        private String borderRadius = "rounded-2xl"; // rounded-none, rounded-lg, rounded-2xl, rounded-3xl
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HeroConfig {
        @Builder.Default
        private String badgeText = "";
        @Builder.Default
        private String title = "";
        @Builder.Default
        private String highlightWords = "";
        @Builder.Default
        private String subtitle = "";
        @Builder.Default
        private String bannerImageUrl = "";
        @Builder.Default
        private String bannerHeight = "540px"; // 420px, 540px, 640px, 760px
        @Builder.Default
        private int overlayOpacity = 70; // 0 - 90
        @Builder.Default
        private boolean showSearchBar = true;
        @Builder.Default
        private String primaryCtaText = "Xem vị trí tuyển dụng";
        @Builder.Default
        private String primaryCtaLink = "#jobs";
        @Builder.Default
        private String secondaryCtaText = "";
        @Builder.Default
        private String secondaryCtaLink = "#about";
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AboutConfig {
        @Builder.Default
        private boolean enabled = true;
        @Builder.Default
        private String badge = "Về Chúng Tôi";
        @Builder.Default
        private String title = "";
        @Builder.Default
        private String description = "";
        @Builder.Default
        private String cultureImageUrl = "";
        @Builder.Default
        private List<StatItem> stats = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StatItem {
        private String icon;
        private String value;
        private String label;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BenefitsConfig {
        @Builder.Default
        private boolean enabled = false;
        @Builder.Default
        private String badge = "Phúc Lợi & Đãi Ngộ";
        @Builder.Default
        private String title = "";
        @Builder.Default
        private String subtitle = "";
        @Builder.Default
        private List<BenefitItem> items = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BenefitItem {
        private String icon;
        private String title;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TechStackConfig {
        @Builder.Default
        private boolean enabled = false;
        @Builder.Default
        private String badge = "Công Nghệ";
        @Builder.Default
        private String title = "";
        @Builder.Default
        private String subtitle = "";
        @Builder.Default
        private List<String> tags = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TestimonialsConfig {
        @Builder.Default
        private boolean enabled = false;
        @Builder.Default
        private String badge = "Đội Ngũ";
        @Builder.Default
        private String title = "";
        @Builder.Default
        private List<TestimonialItem> items = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TestimonialItem {
        private String name;
        private String role;
        private String avatarUrl;
        private String quote;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FooterConfig {
        @Builder.Default
        private String copyrightText = "";
        private String contactEmail;
        private String contactPhone;
        private String address;
        private String linkedinUrl;
        private String facebookUrl;
        private String githubUrl;
        private String websiteUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SeoConfig {
        @Builder.Default
        private String metaTitle = "";
        @Builder.Default
        private String metaDescription = "";
        private String ogImageUrl;
    }
}
